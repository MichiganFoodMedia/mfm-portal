-- ================================================
-- Michigan Food Media Portal - Supabase Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor)
-- ================================================

-- 1. Profiles table (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'creator', -- 'creator' or 'admin'
  instagram_handle text,
  tiktok_handle text,
  location text,
  travel_radius integer default 50,
  rate integer default 0,
  phone text,
  agreed_to_terms boolean default false,
  agreed_at timestamptz,
  status text default 'active', -- 'active', 'suspended'
  created_at timestamptz default now()
);

-- 2. Activation codes table
create table if not exists activation_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  created_for_name text,
  created_for_email text,
  used boolean default false,
  used_by uuid references profiles(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Restaurants table
create table if not exists restaurants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text,
  cuisine text,
  budget integer,
  contact_email text,
  contact_name text,
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

-- 4. Collaborations table
create table if not exists collaborations (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references restaurants(id),
  creator_id uuid references profiles(id),
  platform text,
  collab_date date,
  collab_time text,
  creator_pay integer,
  deliverables text,
  status text default 'open', -- 'open', 'pending', 'confirmed', 'completed', 'cancelled'
  payment_status text default 'unpaid', -- 'unpaid', 'paid'
  notes text,
  created_at timestamptz default now()
);

-- 5. Messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id),
  recipient_id uuid references profiles(id),
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================

alter table profiles enable row level security;
alter table activation_codes enable row level security;
alter table restaurants enable row level security;
alter table collaborations enable row level security;
alter table messages enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can update all profiles"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Allow insert on profiles"
  on profiles for insert with check (auth.uid() = id);

-- Activation codes: only admins can create, anyone can read to verify
create policy "Anyone can verify codes"
  on activation_codes for select using (true);

create policy "Admins can manage codes"
  on activation_codes for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Restaurants: admins manage, creators can view
create policy "Creators can view restaurants"
  on restaurants for select using (auth.uid() is not null);

create policy "Admins can manage restaurants"
  on restaurants for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Collaborations: creators see own, admins see all
create policy "Creators can view own collabs"
  on collaborations for select using (
    creator_id = auth.uid() or creator_id is null
  );

create policy "Admins can manage all collabs"
  on collaborations for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Creators can update own collabs"
  on collaborations for update using (creator_id = auth.uid());

-- Messages: users see their own messages
create policy "Users can view own messages"
  on messages for select using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );

create policy "Users can send messages"
  on messages for insert with check (sender_id = auth.uid());

-- ================================================
-- Seed: Create admin user profile helper
-- After signing up your admin account, run this:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ================================================

-- Seed some activation codes for testing
insert into activation_codes (code, created_for_name, expires_at)
values 
  ('MFMC-2025', 'Test Creator', now() + interval '30 days'),
  ('MFMC-FOOD1', 'Test Creator 2', now() + interval '30 days'),
  ('MFMC-ALPHA', 'Test Creator 3', now() + interval '30 days')
on conflict (code) do nothing;
