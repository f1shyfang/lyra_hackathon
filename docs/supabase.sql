-- Minimal schema for analysis logging
create extension if not exists "pgcrypto";

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  post_text text not null,
  company_hint text,
  variant_id text,
  response jsonb not null,
  latency_ms int,
  user_id text
);
