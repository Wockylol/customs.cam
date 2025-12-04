-- Threads (one per LoopMessage group/conversation)
create table if not exists public.threads (
  id bigserial primary key,
  group_id text unique not null,
  name text,
  client_id text,
  participants text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (one per message)
create table if not exists public.messages (
  id bigserial primary key,
  message_id text unique,
  thread_id bigint not null references public.threads(id) on delete cascade,
  message_type text default 'text',
  direction text not null check (direction in ('inbound','outbound')),
  text text,
  sender_phone_number text,
  sender_name text,
  reaction text,
  reaction_event text,
  speech_text text,
  speech_metadata jsonb,
  created_at timestamptz default now()
);

-- Attachments (0..n per message)
create table if not exists public.attachments (
  id bigserial primary key,
  message_id bigint not null references public.messages(id) on delete cascade,
  url text not null
);

-- Contacts (optional, to map phone→name)
create table if not exists public.contacts (
  id bigserial primary key,
  phone_number text unique not null,
  name text
);

-- Keep threads.updated_at fresh whenever a new message arrives
create or replace function public.bump_thread_updated_at()
returns trigger language plpgsql as $$
begin
  update public.threads
    set updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_bump_thread on public.messages;
create trigger trg_messages_bump_thread
after insert on public.messages
for each row execute function public.bump_thread_updated_at();