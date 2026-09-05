-- One-time setup for Dayframe's private file attachments (Essentials > Documents).
-- Run this once in the Supabase project's SQL Editor (dashboard > SQL Editor > New query).
--
-- Creates a private storage bucket and restricts every object in it to the
-- user who owns the folder it lives in. The app always uploads to
-- "<auth.uid()>/<...>", so this policy is what stops one user from reading
-- or overwriting another user's files.

insert into storage.buckets (id, name, public)
values ('dayframe-documents', 'dayframe-documents', false)
on conflict (id) do nothing;

-- Dropped first so this script is safe to run more than once.
drop policy if exists "Users manage their own documents" on storage.objects;

create policy "Users manage their own documents"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'dayframe-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'dayframe-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
