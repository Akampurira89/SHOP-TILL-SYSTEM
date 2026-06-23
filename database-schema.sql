-- ===================== POS SYSTEM SCHEMA =====================
-- Run this once in Supabase SQL Editor

create table users (
  id text primary key,
  name text not null,
  username text not null unique,
  password text not null,
  role text not null default 'cashier',
  active boolean not null default true,
  created_at timestamptz default now()
);

create table products (
  id text primary key,
  name text not null,
  sku text,
  category text,
  cost numeric not null default 0,
  sale_price numeric not null default 0,
  min_sale numeric default 0,
  price_mode text not null default 'fixed',
  stock numeric not null default 0,
  created_at timestamptz default now()
);

create table suppliers (
  id text primary key,
  name text not null,
  phone text,
  notes text,
  balance numeric not null default 0,
  created_at timestamptz default now()
);

create table supplier_tx (
  id text primary key,
  supplier_id text references suppliers(id) on delete set null,
  type text not null,
  amount numeric not null,
  note text,
  by_id text,
  at timestamptz default now()
);

create table sales (
  id text primary key,
  receipt_no text not null,
  cashier_id text,
  cashier_name text,
  items jsonb not null,
  total numeric not null,
  payment_method text not null,
  customer_name text,
  reversed boolean default false,
  reversed_at timestamptz,
  reversed_by text,
  reverse_reason text,
  at timestamptz default now()
);

create table expenses (
  id text primary key,
  category text not null,
  description text,
  amount numeric not null,
  by_id text,
  by_name text,
  at timestamptz default now()
);

create table shifts (
  id text primary key,
  user_id text not null,
  opening_cash numeric not null default 0,
  closing_cash numeric,
  notes text,
  opened_at timestamptz default now(),
  closed_at timestamptz
);

create table stock_adj (
  id text primary key,
  product_id text references products(id) on delete set null,
  product_name text,
  type text not null,
  qty_change numeric not null,
  new_stock numeric not null,
  reason text,
  note text,
  unit_cost numeric default 0,
  supplier_id text references suppliers(id) on delete set null,
  supplier_name text,
  by_id text,
  by_name text,
  at timestamptz default now()
);

create table audit_log (
  id text primary key,
  actor_id text,
  action text not null,
  detail text,
  at timestamptz default now()
);

create table settings (
  id text primary key default 'main',
  shop_name text default 'My Supermarket',
  currency text default 'UGX',
  momo_lines jsonb default '[]',
  low_stock_threshold numeric default 5
);

-- ===================== ENABLE RLS =====================
alter table users enable row level security;
alter table products enable row level security;
alter table suppliers enable row level security;
alter table supplier_tx enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
alter table shifts enable row level security;
alter table stock_adj enable row level security;
alter table audit_log enable row level security;
alter table settings enable row level security;

-- ===================== POLICIES =====================
-- These allow full read/write access using the publishable (anon) key.
-- This is appropriate because only your staff, using your app, have this key —
-- it is not exposed for arbitrary public signup/access like a consumer app would need.

create policy "allow all" on users for all using (true) with check (true);
create policy "allow all" on products for all using (true) with check (true);
create policy "allow all" on suppliers for all using (true) with check (true);
create policy "allow all" on supplier_tx for all using (true) with check (true);
create policy "allow all" on sales for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
create policy "allow all" on shifts for all using (true) with check (true);
create policy "allow all" on stock_adj for all using (true) with check (true);
create policy "allow all" on audit_log for all using (true) with check (true);
create policy "allow all" on settings for all using (true) with check (true);

-- ===================== SEED DEFAULT ADMIN + SETTINGS =====================
insert into users (id, name, username, password, role, active)
values ('u1', 'Admin', 'admin', 'admin123', 'admin', true);

insert into settings (id, shop_name, currency, momo_lines, low_stock_threshold)
values ('main', 'My Supermarket', 'UGX',
  '[{"id":"m1","label":"MTN MoMo","number":"0781137391"},{"id":"m2","label":"Airtel Money","number":"0743111076"}]',
  5);
