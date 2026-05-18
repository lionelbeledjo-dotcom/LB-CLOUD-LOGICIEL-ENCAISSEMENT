insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "Avatars are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars');

create policy "Authenticated users can update avatars"
on storage.objects for update to authenticated
using (bucket_id = 'avatars');

create policy "Authenticated users can delete avatars"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars');