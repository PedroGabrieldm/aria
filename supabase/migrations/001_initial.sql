-- Profiles (multi-tenant base)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  whatsapp_number text unique,
  plan text default 'free', -- 'free' | 'pro' | 'business'
  google_calendar_token jsonb,
  evolution_instance text,
  created_at timestamptz default now()
);

-- Transações financeiras
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null, -- 'income' | 'expense'
  amount decimal(10,2) not null,
  category text not null,
  description text,
  date date default current_date,
  created_at timestamptz default now()
);

-- Tarefas / Lembretes
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending', -- 'pending' | 'in_progress' | 'done'
  due_date timestamptz,
  created_at timestamptz default now()
);

-- Histórico de conversas WhatsApp
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  media_type text default 'text', -- 'text' | 'audio' | 'image'
  created_at timestamptz default now()
);

-- RLS (Row Level Security) — isolamento multi-tenant
alter table transactions enable row level security;
alter table tasks enable row level security;
alter table messages enable row level security;
alter table profiles enable row level security;

create policy "users_own_data" on transactions for all using (auth.uid() = user_id);
create policy "users_own_data" on tasks for all using (auth.uid() = user_id);
create policy "users_own_data" on messages for all using (auth.uid() = user_id);
create policy "users_own_profile" on profiles for all using (auth.uid() = id);
