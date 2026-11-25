import { Buffer } from "node:buffer";

export const mailboxPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

export async function gmailInviteSender() {
  const from = Deno.env.get("OWNER_NOTIFICATION_FROM")?.trim();
  const clientId = Deno.env.get("GMAIL_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")?.trim();
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN")?.trim();
  if (!from || !mailboxPattern.test(from) || !clientId || !clientSecret || !refreshToken) {
    throw new Error("The Gmail sender is not configured for invitations.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Gmail could not authorize the sender. Check the Gmail connection.");
  }
  const { access_token: token } = await response.json();
  if (typeof token !== "string" || !token) throw new Error("Gmail did not return an access token.");

  return async (to: string, role: string, link: string) => {
    const body = Buffer.from(`You have been invited to Veticare as ${role}. Open this link to set your password and accept the invitation:\n\n${link}\n\nIf you did not expect this invitation, you can ignore this email.`, "utf8")
      .toString("base64").replace(/.{1,76}/g, "$&\r\n");
    const message = [
      `From: Veticare <${from}>`, `To: <${to}>`, "Subject: Veticare account invitation",
      "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64", "", body,
    ].join("\r\n");
    const sent = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: Buffer.from(message, "utf8").toString("base64url") }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    await sent.body?.cancel().catch(() => {});
    if (!sent.ok) throw new Error(`Gmail rejected the invitation (${sent.status}).`);
  };
}
