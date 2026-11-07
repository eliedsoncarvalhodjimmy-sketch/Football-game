-- =====================================================================
-- Produtos e stock (passo 1E)
-- =====================================================================

-- O sinal da quantidade tem de bater certo com o tipo de movimento.
alter table public.stock_movements add constraint stock_movements_sign check (
  (movement_type = 'entrada' and quantity > 0)
  or (movement_type = 'venda' and quantity < 0)
  or (movement_type = 'cancelamento' and quantity > 0)
  or movement_type = 'ajuste'
);

-- Fotos dos perfumes: leitura pública (são imagens de catálogo, sem dados pessoais),
-- para poderem ficar guardadas no aparelho e aparecer sem internet.
-- Carregar, substituir e apagar continua a ser só do CEO.
update storage.buckets set public = true where id = 'produtos';

-- SKU sempre em maiúsculas e sem espaços nas pontas
create or replace function public.tg_variants_sku()
returns trigger
language plpgsql
as $$
begin
  new.sku := upper(trim(new.sku));
  return new;
end;
$$;
create trigger variants_sku before insert or update on public.product_variants
  for each row execute function public.tg_variants_sku();
revoke execute on function public.tg_variants_sku() from authenticated, anon;
