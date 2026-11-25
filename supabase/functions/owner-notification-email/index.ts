import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OwnerEmail = {
  id: string;
  claim_token: string;
  kind: "impound" | "registration";
  pet_name: string;
  email: string | null;
  impounded_on: string | null;
};

type Delivery = { status: "pending" | "sent" | "skipped" | "failed"; last_error: string | null };

const encoder = new TextEncoder();
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });
const mailboxPattern = /^[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+$/u;

function emailContent(job: OwnerEmail) {
  if (job.kind === "impound") {
    const date = job.impounded_on ? ` on ${dateFormat.format(new Date(job.impounded_on))}` : "";
    return {
      subject: "Veticare: Impound report for your pet",
      text: `An impound report was filed for your pet ${job.pet_name}${date}. Please contact the Batangas City Veterinary Office for the location and next steps.`,
    };
  }

  return {
    subject: "Veticare: Pet registration renewal required",
    text: `The registration for your pet ${job.pet_name} has expired. Please sign in to Veticare or contact the Batangas City Veterinary Office to request renewal.`,
  };
}

function encodeEmail(job: OwnerEmail, from: string, to: string) {
  const { subject, text } = emailContent(job);
  const body = Buffer.from(text, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n");
  const message = [
    `From: Veticare <${from}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <veticare-${job.id}@${from.split("@")[1]}>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}

async function gmailAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("Gmail token refresh rejected", response.status);
      await response.body?.cancel().catch(() => {});
      return null;
    }

    const { access_token: token } = await response.json();
    if (typeof token === "string" && token.length > 0) return token;
    console.error("Gmail token refresh returned no access token");
  } catch {
    console.error("Gmail token refresh failed");
  }
  return null;
}

async function deliver(raw: string, accessToken: string): Promise<Delivery> {
  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel().catch(() => {});
    if (response.ok) return { status: "sent", last_error: null };

    if (response.status >= 500 || response.status === 408) {
      return { status: "failed", last_error: `gmail_delivery_unconfirmed_http_${response.status}` };
    }
    const rejected = [401, 403, 429].includes(response.status);
    return { status: rejected ? "pending" : "failed", last_error: `gmail_http_${response.status}` };
  } catch {
    return { status: "failed", last_error: "gmail_delivery_unconfirmed" };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  const key = Deno.env.get("OWNER_NOTIFICATION_WORKER_KEY");
  const suppliedKey = encoder.encode(request.headers.get("x-owner-notification-key") ?? "");
  const expectedKey = encoder.encode(key ?? "");
  if (!key || suppliedKey.length !== expectedKey.length || !timingSafeEqual(suppliedKey, expectedKey)) {
    return new Response(null, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("GMAIL_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")?.trim();
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN")?.trim();
  const from = Deno.env.get("OWNER_NOTIFICATION_FROM")?.trim();
  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !refreshToken || !from || !mailboxPattern.test(from)) {
    return new Response("Email delivery is not configured.", { status: 503 });
  }

  const accessToken = await gmailAccessToken(clientId, clientSecret, refreshToken);
  if (!accessToken) return new Response("Gmail authorization failed.", { status: 503 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("claim_owner_notification_emails").returns<OwnerEmail[]>();
  if (error || !Array.isArray(data)) {
    console.error("Owner email claim failed", error?.code ?? "unexpected_response");
    return new Response(null, { status: 500 });
  }

  const results = { sent: 0, pending: 0, skipped: 0, failed: 0, writeErrors: 0 };
  for (const job of data) {
    let delivery: Delivery;
    if (!job.email) {
      delivery = { status: "skipped", last_error: "recipient_or_event_ineligible" };
    } else if (!mailboxPattern.test(job.email)) {
      delivery = { status: "failed", last_error: "invalid_recipient_address" };
    } else {
      const raw = encodeEmail(job, from, job.email);
      const { data: started, error: startError } = await supabase.rpc("start_owner_notification_send", {
        p_id: job.id,
        p_claim_token: job.claim_token,
      });
      if (startError || started !== true) {
        console.error("Owner email send could not be started", startError?.code ?? "claim_inactive");
        results.writeErrors++;
        continue;
      }
      delivery = await deliver(raw, accessToken);
    }
    if (delivery.last_error?.startsWith("gmail_")) console.error("Owner email delivery", delivery.last_error);

    const { error: writeError } = await supabase.from("owner_notification_emails")
      .update({ ...delivery, send_started_at: null })
      .eq("id", job.id)
      .eq("claim_token", job.claim_token);
    if (writeError) {
      console.error("Owner email status update failed", writeError.code);
      results.writeErrors++;
    } else {
      results[delivery.status]++;
    }
  }

  return Response.json(results, { status: results.writeErrors ? 500 : 200 });
});
