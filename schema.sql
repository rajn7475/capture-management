-- ============================================================
-- CAPTURE MANAGEMENT TOOL — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'member', -- 'admin' or 'member'
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'member');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Opportunities (shared across team)
create table public.opportunities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  agency text,
  contract_number text,
  vehicle text,
  value numeric default 0,
  expiry date,
  stage text default 'Identified',
  priority text default 'MEDIUM',
  incumbent text,
  strategy text,
  contacts jsonb default '[]',
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.opportunities enable row level security;
create policy "All authenticated users can view opportunities" on public.opportunities for select using (auth.role() = 'authenticated');
create policy "All authenticated users can insert opportunities" on public.opportunities for insert with check (auth.role() = 'authenticated');
create policy "All authenticated users can update opportunities" on public.opportunities for update using (auth.role() = 'authenticated');
create policy "All authenticated users can delete opportunities" on public.opportunities for delete using (auth.role() = 'authenticated');

-- Actions (personal per user per opportunity)
create table public.actions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  opportunity_id uuid references public.opportunities on delete cascade not null,
  text text not null,
  due_date date,
  done boolean default false,
  created_at timestamptz default now()
);
alter table public.actions enable row level security;
create policy "Users can manage own actions" on public.actions for all using (auth.uid() = user_id);

-- Notes (personal per user per opportunity)
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  opportunity_id uuid references public.opportunities on delete cascade not null,
  content text default '',
  updated_at timestamptz default now(),
  unique(user_id, opportunity_id)
);
alter table public.notes enable row level security;
create policy "Users can manage own notes" on public.notes for all using (auth.uid() = user_id);

-- Chat history (personal per user per opportunity)
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  opportunity_id uuid references public.opportunities on delete cascade not null,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamptz default now()
);
alter table public.chats enable row level security;
create policy "Users can manage own chats" on public.chats for all using (auth.uid() = user_id);

-- ============================================================
-- MAKE YOURSELF ADMIN
-- After signing up, run this with your email:
-- UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ============================================================
