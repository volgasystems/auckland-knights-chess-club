-- Add event albums while retaining every existing photo and publication status.
begin;
alter table public.gallery_photos add column if not exists event_name text;
create index if not exists gallery_photos_event_album_idx on public.gallery_photos(event_name, event_date);
commit;
