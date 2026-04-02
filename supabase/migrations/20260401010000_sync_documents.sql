create table if not exists public.sync_documents (
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,
  kind text not null check (
    kind in (
      'daily_note_markdown',
      'page_markdown',
      'widget_markdown',
      'widget_storage_blob',
      'asset_blob',
      'excalidraw_blob'
    )
  ),
  revision integer not null check (revision >= 1),
  content_hash text not null,
  text_content text,
  blob_key text,
  deleted_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by_device_id text not null,
  primary key (user_id, path),
  check (
    deleted_at is not null
    or (
      kind in ('daily_note_markdown', 'page_markdown', 'widget_markdown')
      and text_content is not null
      and blob_key is null
    )
    or (
      kind in ('widget_storage_blob', 'asset_blob', 'excalidraw_blob')
      and text_content is null
      and blob_key is not null
    )
  )
);

create index if not exists sync_documents_user_updated_at_idx
  on public.sync_documents (user_id, updated_at desc);

alter table public.sync_documents enable row level security;

drop policy if exists "Users can read their sync documents" on public.sync_documents;
create policy "Users can read their sync documents"
  on public.sync_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their sync documents" on public.sync_documents;
create policy "Users can insert their sync documents"
  on public.sync_documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their sync documents" on public.sync_documents;
create policy "Users can update their sync documents"
  on public.sync_documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their sync documents" on public.sync_documents;
create policy "Users can delete their sync documents"
  on public.sync_documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('sync-blobs', 'sync-blobs', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can manage their sync blobs" on storage.objects;
create policy "Users can manage their sync blobs"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sync-blobs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
