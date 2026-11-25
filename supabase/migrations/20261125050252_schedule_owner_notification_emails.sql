create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule('send-owner-notification-emails', '* * * * *', $job$
  select net.http_post(
    url := rtrim(project.decrypted_secret, '/') || '/functions/v1/owner-notification-email',
    headers := jsonb_build_object('x-owner-notification-key', worker.decrypted_secret),
    timeout_milliseconds := 60000
  )
  from vault.decrypted_secrets as project
  cross join vault.decrypted_secrets as worker
  where project.name = 'owner_notification_project_url'
    and nullif(btrim(project.decrypted_secret), '') is not null
    and worker.name = 'owner_notification_worker_key'
    and nullif(btrim(worker.decrypted_secret), '') is not null
    and exists (
      select 1
      from public.owner_notification_emails
      where status = 'pending' and next_attempt_at <= now()
    );
$job$);
