-- Dissertation Verifier schema (Phase 0)
-- Run in the Supabase SQL editor after creating the project.
-- Enable pgvector for similarity search (Phase 4)
create extension if not exists "vector";
create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  abstract text,
  keywords text[],
  field text,
  -- embedding vector(1536),  -- placeholder: added in Phase 4
  created_at timestamptz not null default now()
);
create table searches (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas (id) on delete cascade,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index searches_idea_id_idx on searches (idea_id);
