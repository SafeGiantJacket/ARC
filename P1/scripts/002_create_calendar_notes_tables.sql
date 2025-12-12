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

-- Disable RLS for now since broker_id is managed client-side
alter table public.broker_calendar_events disable row level security;
alter table public.broker_notes disable row level security;

-- Create indexes for performance
create index if not exists idx_calendar_broker on public.broker_calendar_events(broker_id);
create index if not exists idx_calendar_placement on public.broker_calendar_events(placement_id);
create index if not exists idx_notes_broker on public.broker_notes(broker_id);
create index if not exists idx_notes_placement on public.broker_notes(placement_id);
