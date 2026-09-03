# Reminder notifications — setup

The code for daily push reminders is deployed. It stays dormant until the
three secrets below exist. Nothing breaks in the meantime — the toggle in
**Account → Security & privacy → Reminders** just returns "Push is not
configured" if someone turns it on before this is done.

## 1. Supabase table

Run in the Supabase SQL editor:

```sql
create table if not exists public.dayframe_push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  tz          text default '',
  updated_at  timestamptz default now()
);

alter table public.dayframe_push_subscriptions enable row level security;

create policy "own push subscriptions"
  on public.dayframe_push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists dayframe_push_subscriptions_user_idx
  on public.dayframe_push_subscriptions (user_id);
```

## 2. Cloudflare Pages env vars (project: investly)

Workers & Pages → **investly** → Settings → Environment variables → Production.
Add these (mark them as **Secret** / "Encrypt"):

| Name | Value |
|---|---|
| `VAPID_PRIVATE_JWK` | `{"kty":"EC","crv":"P-256","d":"u8MT-qy0nGiOmtmiusXouXKk7-F3aN7KNOpu_prYUV4","x":"_6paUEvPEodVxJ7pO2JeoPWM6RbPIWA3k-nchq5zysU","y":"y0Vvjpr0Wrm7aavCGotxi_eQynOzRVdsiYh7C-C0tws"}` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Project Settings → API → `service_role` key |
| `PUSH_CRON_SECRET` | any long random string you choose (e.g. `openssl rand -hex 32`) |
| `VAPID_SUBJECT` | *(optional)* `mailto:you@yourdomain` — a contact for push services |

The matching **public** VAPID key is already hard-coded in `index.html` and
`_worker.js` (`DAYFRAME_VAPID_PUBLIC_KEY`). If you ever rotate the keypair,
change it in both places and re-set `VAPID_PRIVATE_JWK`.

Redeploy after adding the vars (push any commit, or "Retry deployment").

## 3. Daily trigger (GitHub Actions)

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `PUSH_CRON_SECRET` | **the same string** you used in step 2 |

The workflow `.github/workflows/daily-reminders.yml` runs at 07:00 UTC and
`POST`s `https://investly.pages.dev/api/push/run` with that secret. Change the
`cron:` line for a different time. You can also run it by hand from the Actions
tab ("Run workflow"), and Cloudflare's own Cron Triggers will call the same
`scheduled()` handler if you'd rather configure it there.

## 4. Test

1. Add Dayframe to your iPhone Home Screen (web push needs the installed PWA on iOS).
2. Open it → Account → Security & privacy → **Reminders → Turn on reminders**, allow the prompt.
3. Tap **Send a test** — a notification should arrive within a few seconds.
4. `POST /api/push/run` (Actions → Run workflow) sends the real "coming up" digest to everyone who has a due item in the next few days.

## What the digest includes

For each subscriber, `pushBuildDigest` in `_worker.js` collects, for roughly the
next 3 days (and recently overdue): dated open tasks, bills due, car renewals,
goal target dates, and the next estimated period date. No notification is sent
to someone with nothing due.
