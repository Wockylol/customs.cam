-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Thread notes table
create table if not exists public.thread_notes (
	id uuid primary key default gen_random_uuid(),
	thread_id bigint not null references public.threads(id) on delete cascade,
	content text not null,
	source_message text not null,
	message_id text, -- references messages.message_id (text) logically; no FK to allow flexibility
	created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_thread_notes_thread_id_created_at
	on public.thread_notes (thread_id, created_at desc);

create index if not exists idx_thread_notes_message_id
	on public.thread_notes (message_id);

-- RLS and policies (adjust to your security model)
alter table public.thread_notes enable row level security;

-- Allow reads for anon and authenticated (browser clients)
do $$
begin
	if not exists (
		select 1 from pg_policies
		where schemaname = 'public' and tablename = 'thread_notes' and policyname = 'Allow select for anon'
	) then
		create policy "Allow select for anon"
			on public.thread_notes
			for select
			to anon, authenticated
			using (true);
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public' and tablename = 'thread_notes' and policyname = 'Allow insert for anon'
	) then
		create policy "Allow insert for anon"
			on public.thread_notes
			for insert
			to anon, authenticated
			with check (true);
	end if;
end
$$;