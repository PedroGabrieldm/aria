-- Trigger: cria automaticamente um perfil quando um novo usuário se registra no Supabase Auth
-- Isso evita violação de foreign key em tasks/messages quando o insert de perfil
-- falhou durante o signup (ex: email ainda não confirmado + RLS bloqueando)

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Remove trigger anterior se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Cria trigger que dispara após insert na tabela de usuários do Auth
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
