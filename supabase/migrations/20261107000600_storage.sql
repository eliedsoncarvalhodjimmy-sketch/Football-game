-- =====================================================================
-- Fotos dos produtos (Supabase Storage, bucket "produtos")
-- Todos os utilizadores activos vêem; só o CEO carrega/apaga.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy produtos_fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'produtos' and public.is_active_user());
create policy produtos_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_ceo());
create policy produtos_fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_ceo());
create policy produtos_fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_ceo());
