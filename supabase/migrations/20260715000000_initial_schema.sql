-- Bowl & Broth Society — initial schema formalization
-- Reverse-engineered from the app's existing query shapes (no prior migrations
-- existed anywhere in the repo). Matches current app behavior, plus:
--   * a partial unique index enforcing "only one active event" (referenced as
--     an assumption in a code comment in the activate route, but never
--     actually created anywhere)
--   * an is_admin() helper + RLS that ties admin-only writes to admin_users
--     membership rather than "any authenticated Supabase user"
--   * orders/order_items are service-role only — see accompanying app-code
--     change that swaps the anon-key client for the service-role client on
--     the handful of trusted server routes that touch these tables

-- gen_random_bytes() (used for orders.public_token) lives in pgcrypto;
-- gen_random_uuid() is native to Postgres 13+ and needs no extension.
create extension if not exists pgcrypto;

-- ── events ────────────────────────────────────────────────────────────────
create table events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  pickup_date       date not null,
  pickup_start      time not null,
  pickup_end        time not null,
  location_name     text not null,
  location_address  text not null,
  deadline          timestamptz not null,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index events_pickup_date_idx on events (pickup_date);

-- Enforces "only one active event at a time" — the activate route relies on
-- this invariant (deactivate-all-then-activate-one) but nothing previously
-- guaranteed it at the DB level.
create unique index events_one_active_idx on events (is_active) where is_active = true;

-- ── products ──────────────────────────────────────────────────────────────
create table products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  price_cents   integer not null check (price_cents >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── event_products (menu assignment) ─────────────────────────────────────
create table event_products (
  event_id      uuid not null references events(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  primary key (event_id, product_id)
);

create index event_products_product_id_idx on event_products (product_id);

-- ── orders ────────────────────────────────────────────────────────────────
create table orders (
  id                                  uuid primary key default gen_random_uuid(),
  event_id                            uuid not null references events(id) on delete restrict,
  status                              text not null default 'pending' check (
                                        status in (
                                          'pending', 'confirmed', 'preparing', 'ready',
                                          'out_for_delivery', 'delivered', 'completed',
                                          'cancelled', 'refunded'
                                        )
                                      ),
  paid                                boolean not null default false,
  total_cents                         integer not null check (total_cents > 0),
  customer_name                       text not null,
  email                               text not null,
  phone                               text,
  sms_opt_in                          boolean not null default false,
  public_token                        text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  stripe_session_id                   text unique,
  stripe_payment_intent_id            text unique,
  confirmation_email_sent_at          timestamptz,
  pickup_reminder_day_before_sent_at  timestamptz,
  pickup_reminder_day_of_sent_at      timestamptz,
  created_at                          timestamptz not null default now()
);

create index orders_event_id_idx on orders (event_id);
create index orders_email_idx on orders (email);
create index orders_created_at_idx on orders (created_at desc);

-- ── order_items ───────────────────────────────────────────────────────────
create table order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  product_id          uuid not null references products(id) on delete restrict,
  qty                 integer not null check (qty > 0),
  unit_price_cents    integer not null check (unit_price_cents >= 0),
  line_total_cents    integer not null check (line_total_cents >= 0),
  created_at          timestamptz not null default now()
);

create index order_items_order_id_idx on order_items (order_id);
create index order_items_product_id_idx on order_items (product_id);

-- ── admin_users ───────────────────────────────────────────────────────────
create table admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── subscribers (marketing signups) ─────────────────────────────────────────
create table subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  phone         text,
  sms_opt_in    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── customer_profiles (admin-curated notes/VIP status) ──────────────────────
create table customer_profiles (
  email         text primary key,
  name          text,
  phone         text,
  sms_opt_in    boolean,
  vip           boolean not null default false,
  notes         text,
  updated_at    timestamptz not null default now()
);

-- ── Helper: is the calling user an active admin? ─────────────────────────────
-- security definer so this can see admin_users regardless of the caller's own
-- RLS visibility into that table (which is restricted to their own row).
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admin_users au
    where au.user_id = auth.uid() and au.is_active = true
  );
$$;

-- ── RPC: per-event order/revenue stats (admin/events pages) ─────────────────
-- security definer so authenticated admins can get aggregated stats without
-- needing broad RLS read access to the orders table itself.
create or replace function admin_event_stats()
returns table (
  event_id uuid,
  orders_total bigint,
  orders_paid bigint,
  orders_unpaid bigint,
  revenue_total_cents bigint,
  revenue_paid_cents bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    e.id as event_id,
    count(o.id) as orders_total,
    count(o.id) filter (where o.paid) as orders_paid,
    count(o.id) filter (where not o.paid) as orders_unpaid,
    coalesce(sum(o.total_cents), 0) as revenue_total_cents,
    coalesce(sum(o.total_cents) filter (where o.paid), 0) as revenue_paid_cents
  from events e
  left join orders o on o.event_id = e.id
  group by e.id;
$$;

grant execute on function admin_event_stats() to authenticated;
grant execute on function is_admin() to authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table events enable row level security;
alter table products enable row level security;
alter table event_products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admin_users enable row level security;
alter table subscribers enable row level security;
alter table customer_profiles enable row level security;

-- events: public can see the active event; admins can see/manage everything
create policy events_select_public on events
  for select to anon, authenticated
  using (is_active = true);

create policy events_select_admin on events
  for select to authenticated
  using (is_admin());

create policy events_write_admin on events
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- products: same public/admin split as events
create policy products_select_public on products
  for select to anon, authenticated
  using (is_active = true);

create policy products_select_admin on products
  for select to authenticated
  using (is_admin());

create policy products_write_admin on products
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- event_products: same public/admin split
create policy event_products_select_public on event_products
  for select to anon, authenticated
  using (is_active = true);

create policy event_products_select_admin on event_products
  for select to authenticated
  using (is_admin());

create policy event_products_write_admin on event_products
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- orders / order_items: no anon or authenticated policies at all.
-- Every current code path that touches these tables is a trusted Next.js
-- server route (checkout, webhook, public order lookup) — those now use the
-- service-role client, which bypasses RLS entirely, so no policy is needed
-- (or safe) here for anon/authenticated.

-- admin_users: a user may see their own membership row (used by the
-- middleware/admin-guard to check "am I an admin"); nothing else.
create policy admin_users_select_self on admin_users
  for select to authenticated
  using (user_id = auth.uid());

-- subscribers: public newsletter signup form upserts by email (anon, no auth)
create policy subscribers_insert_public on subscribers
  for insert to anon
  with check (true);

create policy subscribers_update_public on subscribers
  for update to anon
  using (true)
  with check (true);

create policy subscribers_select_admin on subscribers
  for select to authenticated
  using (is_admin());

-- customer_profiles: admin-curated only (written via a service-role-gated
-- API route today); no anon/authenticated self-service writes.
create policy customer_profiles_select_admin on customer_profiles
  for select to authenticated
  using (is_admin());
