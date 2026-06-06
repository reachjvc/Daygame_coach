-- Create isolated test embeddings table for QUALITY-TEST.1 batch (20 videos)
-- Mirrors the production embeddings table structure

create extension if not exists vector;

create table if not exists embeddings_test (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null,
  embedding vector(768) not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists embeddings_test_embedding_idx
  on embeddings_test
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

create index if not exists embeddings_test_source_idx
  on embeddings_test (source);

-- RPC for vector similarity search on test table
create or replace function match_embeddings_test(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  source text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.content,
    e.source,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings_test e
  where 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
