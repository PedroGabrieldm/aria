-- Tabela de categorias personalizadas por usuário
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null default 'both', -- 'income' | 'expense' | 'both'
  color text,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table categories enable row level security;

create policy "users can manage own categories"
  on categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
