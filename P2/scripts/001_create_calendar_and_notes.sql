-- Create broker_calendar_events table
create table if not exists public.broker_calendar_events (
  id uuid primary key default gen_random_uuid(),
  broker_id text not null,
  placement_id text not null,
  event_title text not null,
  event_description text,
  event_date timestamp not null,
  event_type text not null default 'renewal',
  priority text not null default 'medium',
  status text not null default 'scheduled',
  ai_suggested boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create broker_notes table
create table if not exists public.broker_notes (
  id uuid primary key default gen_random_uuid(),
  broker_id text not null,
  placement_id text not null,
  note_title text not null,
  note_content text not null,
  note_category text not null default 'general',
  tags text[] default array[]::text[],
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable RLS
alter table public.broker_calendar_events enable row level security;
alter table public.broker_notes enable row level security;

-- Create policies for broker_calendar_events
create policy "Brokers can view their own calendar events"
  on public.broker_calendar_events for select
  using (broker_id = current_user_id());

create policy "Brokers can insert their own calendar events"
  on public.broker_calendar_events for insert
  with check (broker_id = current_user_id());

create policy "Brokers can update their own calendar events"
  on public.broker_calendar_events for update
  using (broker_id = current_user_id());

create policy "Brokers can delete their own calendar events"
  on public.broker_calendar_events for delete
  using (broker_id = current_user_id());

-- Create policies for broker_notes
create policy "Brokers can view their own notes"
  on public.broker_notes for select
  using (broker_id = current_user_id());

create policy "Brokers can insert their own notes"
  on public.broker_notes for insert
  with check (broker_id = current_user_id());

create policy "Brokers can update their own notes"
  on public.broker_notes for update
  using (broker_id = current_user_id());

create policy "Brokers can delete their own notes"
  on public.broker_notes for delete
  using (broker_id = current_user_id());
