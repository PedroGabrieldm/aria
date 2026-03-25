-- Histórico de pagamentos por usuário
create table payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount decimal(10,2) not null,
  currency text not null default 'BRL',
  status text not null, -- 'paid' | 'pending' | 'failed' | 'refunded'
  description text,
  payment_method text, -- 'credit_card' | 'pix' | 'boleto'
  reference_id text,   -- ID externo (ex: Stripe charge_id)
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "users can view own payments"
  on payments for select
  using (auth.uid() = user_id);
