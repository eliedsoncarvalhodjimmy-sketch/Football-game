-- Ajudas para os testes
create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'TESTE FALHOU: %', p_msg; end if;
end $$;

-- Executa SQL e exige que dê erro
create function tests.erro(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'TESTE FALHOU (devia dar erro): %', p_msg;
end $$;

-- Executa um UPDATE/DELETE e devolve quantas linhas mudou
create function tests.linhas(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema tests to authenticated, anon;

-- Entrar como um utilizador (simula a sessão do Supabase)
create function tests.entrar(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false)
$$;

-- Sair da sessão (volta a ser o administrador da base, sem utilizador)
create function tests.sair() returns void language sql as $$
  select set_config('request.jwt.claims', '', false)
$$;
