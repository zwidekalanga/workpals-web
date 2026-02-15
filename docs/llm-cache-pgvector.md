# Semantic LLM Response Cache with pgvector

> **Use case:** Cache JD (job description) normalization results from an LLM. On future requests, generate an embedding of the incoming JD, search for semantically similar cached entries above a 0.95 cosine similarity threshold, and return the cached result instead of calling the LLM again.

---

## Table of Contents

1. [Table Schema](#1-table-schema)
2. [pgvector Similarity Search](#2-pgvector-similarity-search)
3. [Indexing (IVFFlat vs HNSW)](#3-indexing-ivfflat-vs-hnsw)
4. [Cache Invalidation Strategies](#4-cache-invalidation-strategies)
5. [Python Integration](#5-python-integration)
6. [Performance Expectations](#6-performance-expectations)
7. [Complete Migration SQL](#7-complete-migration-sql)

---

## 1. Table Schema

### Core `llm_cache` Table

```sql
create table public.llm_cache (
  id            uuid primary key default gen_random_uuid(),

  -- The embedding of the input text (JD), used for similarity search
  -- text-embedding-3-small outputs 1536 dimensions
  embedding     vector(1536) not null,

  -- SHA-256 hash of the raw input text, for exact-match dedup before vector search
  request_hash  text not null unique,

  -- The raw input text (the JD content that was sent to the LLM)
  request_text  text not null,

  -- The LLM's normalized response, stored as JSONB for flexible schema
  response      jsonb not null,

  -- Which model produced this response
  model_id      text not null default 'gpt-4o',

  -- Which embedding model was used (for future-proofing if you change models)
  embedding_model text not null default 'text-embedding-3-small',

  -- Metadata: token counts, latency, any tags
  metadata      jsonb not null default '{}',

  -- Cache management
  hit_count     integer not null default 0,
  last_hit_at   timestamptz,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### Design Rationale

| Column | Purpose |
|---|---|
| `embedding` | The 1536-dim vector from `text-embedding-3-small`. This is what gets searched via cosine similarity. |
| `request_hash` | SHA-256 of the raw JD text. Provides a fast exact-match check **before** vector search. If the exact same JD comes in, skip embedding generation entirely. |
| `request_text` | The original JD text. Useful for debugging, auditing, and re-embedding if you change models. |
| `response` | JSONB containing the LLM's normalized output. Flexible schema means you can evolve the normalization format without migrations. |
| `model_id` | Track which LLM produced the result. Essential if you upgrade models and want to invalidate old cache entries. |
| `embedding_model` | Track which embedding model was used. If you switch from `text-embedding-3-small` to `text-embedding-3-large`, old embeddings are incompatible. |
| `expires_at` | TTL-based expiration. Defaults to 30 days. Expired rows are excluded from search and cleaned up by a cron job. |
| `hit_count` / `last_hit_at` | Track cache usage for analytics and LRU-style eviction. |

---

## 2. pgvector Similarity Search

### Operator Reference

pgvector provides these distance operators:

| Operator | Metric | Returns | Use When |
|---|---|---|---|
| `<->` | L2 (Euclidean) distance | float (0 = identical) | General-purpose, unnormalized vectors |
| `<=>` | Cosine distance | float (0 = identical, 2 = opposite) | **Best for embeddings. Safe default.** |
| `<#>` | Negative inner product | float (more negative = more similar) | Normalized embeddings only (marginally faster) |
| `<+>` | L1 (Manhattan) distance | float | Sparse vectors |

### Critical: Cosine Distance vs Cosine Similarity

pgvector's `<=>` operator returns **cosine distance**, NOT cosine similarity.

```
cosine_similarity = 1 - cosine_distance
cosine_distance   = 1 - cosine_similarity
```

So when you want entries with **similarity >= 0.95**, you filter for **distance <= 0.05**:

```sql
-- CORRECT: Filter using cosine distance
WHERE embedding <=> query_embedding <= 0.05    -- 1 - 0.95 = 0.05

-- EQUIVALENT but less performant (can't use index for the filter):
WHERE 1 - (embedding <=> query_embedding) >= 0.95
```

### The Cache Lookup Query

```sql
-- Find the best cache hit for a given JD embedding
select
  id,
  response,
  request_text,
  1 - (embedding <=> $1) as similarity
from public.llm_cache
where embedding <=> $1 < 0.05          -- cosine similarity > 0.95
  and expires_at > now()                -- not expired
  and embedding_model = 'text-embedding-3-small'  -- same embedding model
order by embedding <=> $1 asc           -- closest first
limit 1;
```

### Postgres Function for Cache Lookup (recommended for Supabase RPC)

```sql
create or replace function match_llm_cache(
  query_embedding  vector(1536),
  similarity_threshold float default 0.95,
  p_embedding_model text default 'text-embedding-3-small'
)
returns table (
  id          uuid,
  response    jsonb,
  request_text text,
  similarity  float
)
language sql stable
as $$
  select
    llm_cache.id,
    llm_cache.response,
    llm_cache.request_text,
    1 - (llm_cache.embedding <=> query_embedding) as similarity
  from public.llm_cache
  where llm_cache.embedding <=> query_embedding < (1 - similarity_threshold)
    and llm_cache.expires_at > now()
    and llm_cache.embedding_model = p_embedding_model
  order by llm_cache.embedding <=> query_embedding asc
  limit 1;
$$;
```

Call it via Supabase RPC:

```typescript
const { data, error } = await supabase.rpc('match_llm_cache', {
  query_embedding: embedding,       // float[] from OpenAI
  similarity_threshold: 0.95,
  p_embedding_model: 'text-embedding-3-small',
})
```

### Updating Hit Count on Cache Hit

```sql
-- After a successful cache hit, bump the counter
update public.llm_cache
set hit_count  = hit_count + 1,
    last_hit_at = now(),
    updated_at  = now()
where id = $1;
```

---

## 3. Indexing (IVFFlat vs HNSW)

### Comparison

| Factor | IVFFlat | HNSW |
|---|---|---|
| **Build speed** | Fast (~2 min for 1M rows) | Slow (~30 min+ for 1M rows) |
| **Index size** | Smaller (~250 MB for 1M x 1536d) | Larger (~730 MB for 1M x 1536d) |
| **Query speed** | Good (2-5 ms) | Excellent (1-2 ms) |
| **Recall at speed** | Good with tuning | Excellent out of the box |
| **Empty table support** | NO -- requires data to build | YES -- can create on empty table |
| **Update resilience** | Poor -- centroids become stale | Good -- graph adapts |
| **Best for** | Large datasets, batch inserts, tight memory | Low-latency queries, frequent inserts |

### Recommendation for LLM Cache

**Use HNSW.** Here is why:

1. Cache entries are inserted one at a time (not batch-loaded), so IVFFlat's stale centroid problem would degrade recall over time.
2. You need high recall at the 0.95 threshold -- a missed cache hit means an unnecessary LLM call.
3. Query latency matters (you are in the hot path of a user request).
4. The cache table will likely stay under 100K rows, so HNSW's larger index size is negligible.
5. HNSW can be created on an empty table (perfect for migrations).

### Index Creation

```sql
-- HNSW index for cosine distance (RECOMMENDED)
create index llm_cache_embedding_hnsw_idx
  on public.llm_cache
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Set search quality at query time (higher = better recall, slower)
-- Default is 40, which is fine for most use cases
set hnsw.ef_search = 40;
```

**HNSW parameters explained:**

| Parameter | Default | Description |
|---|---|---|
| `m` | 16 | Max connections per node per layer. Higher = better recall, more memory, slower build. 16 is good for < 100K rows. |
| `ef_construction` | 64 | Build-time candidate list size. Higher = better index quality, slower build. 64 is fine for < 100K rows. |
| `hnsw.ef_search` | 40 | Query-time candidate list size. Increase to 100-200 if you need 99.9% recall. |

If you ever need IVFFlat instead (e.g., for a very large table with batch reindexing):

```sql
-- IVFFlat index (only if table has data already)
-- Rule of thumb: lists = rows / 1000 (for < 1M rows)
-- For 10K rows: lists = 10; for 100K rows: lists = 100
create index llm_cache_embedding_ivfflat_idx
  on public.llm_cache
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- At query time, set probes = sqrt(lists) for a good starting point
set ivfflat.probes = 10;
```

### Supporting Indexes

```sql
-- Fast exact-match dedup check via request_hash
create unique index llm_cache_request_hash_idx
  on public.llm_cache (request_hash);

-- Fast TTL filtering (expired row cleanup)
create index llm_cache_expires_at_idx
  on public.llm_cache (expires_at)
  where expires_at is not null;

-- Filter by embedding model (future-proofing)
create index llm_cache_embedding_model_idx
  on public.llm_cache (embedding_model);
```

---

## 4. Cache Invalidation Strategies

### Strategy 1: TTL-Based Expiration (Recommended Primary Strategy)

Every cache entry has an `expires_at` timestamp. The similarity search query already filters out expired rows. A periodic cleanup job removes them.

```sql
-- Cleanup expired entries (run via pg_cron or external cron)
delete from public.llm_cache
where expires_at < now();
```

**Setting up pg_cron in Supabase:**

```sql
-- Enable pg_cron (Supabase has this available)
create extension if not exists pg_cron;

-- Run cleanup daily at 3 AM UTC
select cron.schedule(
  'llm-cache-cleanup',
  '0 3 * * *',
  $$delete from public.llm_cache where expires_at < now()$$
);
```

**TTL guidance for JD normalization:**
- 30 days is a reasonable default. Job descriptions don't change the normalization rules frequently.
- If you update your LLM prompt or model, invalidate the entire cache (see Strategy 3).

### Strategy 2: Row Count Cap

Prevent unbounded growth by capping the table size. Evict least-recently-used entries.

```sql
-- Evict oldest/least-used entries when table exceeds 50,000 rows
-- Run periodically or as a trigger
delete from public.llm_cache
where id in (
  select id
  from public.llm_cache
  order by last_hit_at asc nulls first, created_at asc
  limit greatest(0, (select count(*) from public.llm_cache) - 50000)
);
```

### Strategy 3: Model/Prompt Version Invalidation

When you change the LLM model or normalization prompt, old cached results are stale.

```sql
-- Invalidate all cache entries for a specific model
delete from public.llm_cache
where model_id = 'gpt-4o';

-- Or invalidate by age (everything before the prompt change)
delete from public.llm_cache
where created_at < '2026-02-01T00:00:00Z';

-- Or soft-invalidate by setting expiration to now
update public.llm_cache
set expires_at = now()
where model_id = 'gpt-4o';
```

### Strategy 4: Embedding Model Migration

If you change from `text-embedding-3-small` to a different embedding model, old embeddings are incompatible.

```sql
-- Delete all entries with the old embedding model
delete from public.llm_cache
where embedding_model != 'text-embedding-3-small';
```

### Recommended Combined Approach

1. **Default TTL of 30 days** on every entry.
2. **Daily cron job** to delete expired rows.
3. **Row count cap of 50K** enforced weekly.
4. **Manual invalidation** when model or prompt changes.
5. **Track `model_id` and `embedding_model`** so you can surgically invalidate.

---

## 5. Python Integration

### Option A: Direct PostgreSQL via asyncpg (Recommended for Backend Services)

```python
import asyncpg
import hashlib
import json
import numpy as np
from openai import AsyncOpenAI
from pgvector.asyncpg import register_vector


# ─── Connection Setup ──────────────────────────────────────────────

async def create_pool():
    """Create a connection pool with pgvector type registration."""
    async def init_connection(conn):
        await register_vector(conn)

    pool = await asyncpg.create_pool(
        dsn="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres",
        min_size=2,
        max_size=10,
        init=init_connection,
    )
    return pool


# ─── Embedding Generation ──────────────────────────────────────────

openai_client = AsyncOpenAI()

async def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dim embedding using text-embedding-3-small."""
    # OpenAI recommends replacing newlines with spaces
    clean_text = text.replace("\n", " ").strip()
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=clean_text,
    )
    return response.data[0].embedding


def compute_hash(text: str) -> str:
    """SHA-256 hash of the input text for exact-match dedup."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ─── Cache Lookup ───────────────────────────────────────────────────

async def cache_lookup(
    pool: asyncpg.Pool,
    embedding: list[float],
    similarity_threshold: float = 0.95,
) -> dict | None:
    """
    Search for a semantically similar cached entry.
    Returns the cached response if similarity >= threshold, else None.
    """
    # Convert threshold to distance: cosine_distance = 1 - cosine_similarity
    distance_threshold = 1.0 - similarity_threshold

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            select
                id,
                response,
                request_text,
                1 - (embedding <=> $1::vector) as similarity
            from public.llm_cache
            where embedding <=> $1::vector < $2
              and expires_at > now()
              and embedding_model = 'text-embedding-3-small'
            order by embedding <=> $1::vector asc
            limit 1
            """,
            json.dumps(embedding),  # pgvector accepts text representation
            distance_threshold,
        )

        if row is None:
            return None

        # Update hit count asynchronously (fire-and-forget is fine here)
        await conn.execute(
            """
            update public.llm_cache
            set hit_count = hit_count + 1,
                last_hit_at = now(),
                updated_at = now()
            where id = $1
            """,
            row["id"],
        )

        return {
            "id": str(row["id"]),
            "response": json.loads(row["response"]),
            "similarity": float(row["similarity"]),
            "request_text": row["request_text"],
        }


# ─── Cache Store ────────────────────────────────────────────────────

async def cache_store(
    pool: asyncpg.Pool,
    request_text: str,
    embedding: list[float],
    response: dict,
    model_id: str = "gpt-4o",
    ttl_days: int = 30,
    metadata: dict | None = None,
) -> str:
    """Store a new LLM response in the cache. Returns the cache entry ID."""
    request_hash = compute_hash(request_text)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            insert into public.llm_cache
              (embedding, request_hash, request_text, response, model_id,
               embedding_model, metadata, expires_at)
            values
              ($1::vector, $2, $3, $4::jsonb, $5, 'text-embedding-3-small',
               $6::jsonb, now() + make_interval(days => $7))
            on conflict (request_hash) do update set
              embedding = excluded.embedding,
              response = excluded.response,
              model_id = excluded.model_id,
              metadata = excluded.metadata,
              expires_at = excluded.expires_at,
              updated_at = now()
            returning id
            """,
            json.dumps(embedding),
            request_hash,
            request_text,
            json.dumps(response),
            model_id,
            json.dumps(metadata or {}),
            ttl_days,
        )
        return str(row["id"])


# ─── Full Cache-Aware Normalization Flow ────────────────────────────

async def normalize_jd(
    pool: asyncpg.Pool,
    jd_text: str,
    similarity_threshold: float = 0.95,
) -> dict:
    """
    Normalize a job description, using the semantic cache when possible.

    Flow:
    1. Check exact hash match (cheapest)
    2. Generate embedding
    3. Search for similar cached entry (vector similarity)
    4. On miss, call LLM and cache the result
    """
    request_hash = compute_hash(jd_text)

    # Step 1: Exact match check (no embedding needed)
    async with pool.acquire() as conn:
        exact_match = await conn.fetchrow(
            """
            select id, response
            from public.llm_cache
            where request_hash = $1
              and expires_at > now()
            """,
            request_hash,
        )
        if exact_match:
            await conn.execute(
                "update public.llm_cache set hit_count = hit_count + 1, "
                "last_hit_at = now(), updated_at = now() where id = $1",
                exact_match["id"],
            )
            return {
                "source": "cache_exact",
                "result": json.loads(exact_match["response"]),
            }

    # Step 2: Generate embedding
    embedding = await generate_embedding(jd_text)

    # Step 3: Semantic similarity search
    cache_hit = await cache_lookup(pool, embedding, similarity_threshold)
    if cache_hit:
        return {
            "source": "cache_semantic",
            "similarity": cache_hit["similarity"],
            "result": cache_hit["response"],
        }

    # Step 4: Cache miss -- call the LLM
    llm_response = await call_llm_normalize(jd_text)  # your LLM call

    # Step 5: Store in cache
    await cache_store(
        pool=pool,
        request_text=jd_text,
        embedding=embedding,
        response=llm_response,
        model_id="gpt-4o",
    )

    return {
        "source": "llm",
        "result": llm_response,
    }


async def call_llm_normalize(jd_text: str) -> dict:
    """Placeholder -- replace with your actual LLM normalization call."""
    # This is where you call GPT-4o / Claude / etc. to normalize the JD
    raise NotImplementedError("Implement your LLM normalization here")
```

### Option B: Via Supabase Python Client (simpler, uses PostgREST + RPC)

```python
from supabase import create_client, Client

supabase: Client = create_client(
    "https://<project-ref>.supabase.co",
    "<service-role-key>",  # Use service role for server-side cache operations
)


async def cache_lookup_supabase(
    embedding: list[float],
    similarity_threshold: float = 0.95,
) -> dict | None:
    """
    Search cache via the match_llm_cache RPC function.
    PostgREST cannot use pgvector operators directly, so we must use RPC.
    """
    result = supabase.rpc(
        "match_llm_cache",
        {
            "query_embedding": embedding,
            "similarity_threshold": similarity_threshold,
            "p_embedding_model": "text-embedding-3-small",
        },
    ).execute()

    if result.data and len(result.data) > 0:
        return result.data[0]
    return None


async def cache_store_supabase(
    request_text: str,
    embedding: list[float],
    response: dict,
    request_hash: str,
) -> None:
    """Store a new cache entry via Supabase client."""
    supabase.table("llm_cache").upsert(
        {
            "embedding": embedding,
            "request_hash": request_hash,
            "request_text": request_text,
            "response": response,
            "model_id": "gpt-4o",
            "embedding_model": "text-embedding-3-small",
        },
        on_conflict="request_hash",
    ).execute()
```

### Option C: Via psycopg (sync, good for scripts and simple services)

```python
import psycopg
from pgvector.psycopg import register_vector

conn = psycopg.connect(
    "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
)
register_vector(conn)

# Query
with conn.cursor() as cur:
    cur.execute(
        """
        select id, response, 1 - (embedding <=> %s::vector) as similarity
        from public.llm_cache
        where embedding <=> %s::vector < %s
          and expires_at > now()
        order by embedding <=> %s::vector asc
        limit 1
        """,
        (str(embedding), str(embedding), 0.05, str(embedding)),
    )
    row = cur.fetchone()
```

### Python Dependencies

```
# requirements.txt (or pyproject.toml)
pgvector>=0.3.6
asyncpg>=0.30.0
openai>=1.60.0
numpy>=1.26.0
# OR for Supabase client approach:
supabase>=2.11.0
```

---

## 6. Performance Expectations

### Query Latency (HNSW index, cosine distance, 1536 dimensions)

| Table Size | Index Build Time | Query Latency (p50) | Query Latency (p99) | Recall @ ef_search=40 |
|---|---|---|---|---|
| 100 rows | < 1 sec | < 1 ms | < 2 ms | ~100% (exact scan) |
| 1,000 rows | ~1 sec | ~1 ms | ~2 ms | ~99.5% |
| 10,000 rows | ~5-10 sec | ~1-2 ms | ~3-5 ms | ~99% |
| 100,000 rows | ~1-3 min | ~2-5 ms | ~8-15 ms | ~98% |
| 1,000,000 rows | ~30-60 min | ~3-8 ms | ~15-30 ms | ~97% |

**Notes:**
- These are estimates based on published benchmarks from pgvector 0.7-0.8 on standard hardware (4-8 vCPUs, 16-32 GB RAM, SSD). Supabase Pro/Team instances are comparable.
- At your expected scale (likely < 100K cached JDs), queries will consistently be under 5 ms.
- For comparison, an LLM normalization call costs 1-10 seconds and $0.01-0.10. A cache hit costs < 5 ms and fractions of a cent.
- The embedding generation call to OpenAI (`text-embedding-3-small`) adds ~100-300 ms per request regardless of cache hit/miss. This is the bottleneck, not pgvector.

### Cost Savings Estimate

| Metric | Without Cache | With Cache (67% hit rate) |
|---|---|---|
| LLM calls per 1000 JDs | 1000 | 330 |
| Avg latency | ~3 sec | ~0.4 sec (weighted avg) |
| Monthly cost (10K JDs) | ~$500-1000 | ~$165-330 |

Industry benchmarks suggest semantic caching achieves 40-80% cost reduction and 67% cache hit rates for repetitive workloads like JD normalization, where many companies post similar roles.

---

## 7. Complete Migration SQL

This is a single migration file suitable for Supabase migrations (`supabase/migrations/`).

```sql
-- ============================================================
-- Migration: Create LLM Semantic Cache with pgvector
-- Description: Implements a semantic cache for LLM-normalized
--              job descriptions using vector similarity search.
-- ============================================================

-- 1. Enable required extensions
create extension if not exists vector
  with schema extensions;

create extension if not exists pg_cron
  with schema pg_catalog;

-- 2. Create the cache table
create table if not exists public.llm_cache (
  id              uuid primary key default gen_random_uuid(),

  -- Vector embedding from text-embedding-3-small (1536 dimensions)
  embedding       vector(1536) not null,

  -- SHA-256 hash of raw input for exact-match dedup
  request_hash    text not null,

  -- Original input text
  request_text    text not null,

  -- LLM response stored as flexible JSONB
  response        jsonb not null,

  -- Model tracking
  model_id        text not null default 'gpt-4o',
  embedding_model text not null default 'text-embedding-3-small',

  -- Arbitrary metadata (token counts, latency, tags, etc.)
  metadata        jsonb not null default '{}',

  -- Cache management fields
  hit_count       integer not null default 0,
  last_hit_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '30 days'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. Add comments for documentation
comment on table public.llm_cache is
  'Semantic cache for LLM-normalized job descriptions. '
  'Uses pgvector cosine similarity to find cached results for similar inputs.';

comment on column public.llm_cache.embedding is
  '1536-dimensional vector from OpenAI text-embedding-3-small. '
  'Searched using cosine distance (<=> operator).';

comment on column public.llm_cache.request_hash is
  'SHA-256 of request_text. Used for exact-match dedup before vector search.';

-- 4. Create indexes

-- HNSW index for fast cosine similarity search
-- m=16, ef_construction=64 are good defaults for < 100K rows
create index llm_cache_embedding_hnsw_idx
  on public.llm_cache
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Unique index on request_hash for exact-match dedup
create unique index llm_cache_request_hash_idx
  on public.llm_cache (request_hash);

-- Index for TTL-based queries and cleanup
create index llm_cache_expires_at_idx
  on public.llm_cache (expires_at);

-- Index for filtering by embedding model
create index llm_cache_embedding_model_idx
  on public.llm_cache (embedding_model);

-- Composite index for common query pattern
create index llm_cache_model_expires_idx
  on public.llm_cache (embedding_model, expires_at)
  where expires_at > now();

-- 5. Create the similarity search function (for Supabase RPC)
create or replace function public.match_llm_cache(
  query_embedding    vector(1536),
  similarity_threshold float default 0.95,
  p_embedding_model  text default 'text-embedding-3-small'
)
returns table (
  id            uuid,
  response      jsonb,
  request_text  text,
  similarity    float
)
language sql stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.response,
    c.request_text,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.llm_cache c
  where c.embedding <=> query_embedding < (1 - similarity_threshold)::double precision
    and c.expires_at > now()
    and c.embedding_model = p_embedding_model
  order by c.embedding <=> query_embedding asc
  limit 1;
$$;

comment on function public.match_llm_cache is
  'Find the most similar cached LLM response for a given embedding. '
  'Returns NULL if no entry exceeds the similarity threshold.';

-- 6. Create helper function to update hit count
create or replace function public.record_cache_hit(p_cache_id uuid)
returns void
language sql volatile
security definer
set search_path = ''
as $$
  update public.llm_cache
  set hit_count  = hit_count + 1,
      last_hit_at = now(),
      updated_at  = now()
  where id = p_cache_id;
$$;

-- 7. Create auto-update trigger for updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger llm_cache_updated_at_trigger
  before update on public.llm_cache
  for each row
  execute function public.update_updated_at_column();

-- 8. Enable Row Level Security
alter table public.llm_cache enable row level security;

-- Policy: Only service_role can read cache entries
-- (The cache is a backend resource, not user-facing)
create policy "Service role can read cache"
  on public.llm_cache
  for select
  to service_role
  using (true);

-- Policy: Only service_role can insert cache entries
create policy "Service role can insert cache"
  on public.llm_cache
  for insert
  to service_role
  with check (true);

-- Policy: Only service_role can update cache entries (hit count, etc.)
create policy "Service role can update cache"
  on public.llm_cache
  for update
  to service_role
  using (true)
  with check (true);

-- Policy: Only service_role can delete cache entries (cleanup)
create policy "Service role can delete cache"
  on public.llm_cache
  for delete
  to service_role
  using (true);

-- 9. Schedule cache cleanup (requires pg_cron extension)
-- Runs daily at 3:00 AM UTC to remove expired entries
select cron.schedule(
  'llm-cache-cleanup-expired',
  '0 3 * * *',
  $$delete from public.llm_cache where expires_at < now()$$
);

-- Runs weekly on Sunday at 4:00 AM UTC to enforce row count cap (50K)
select cron.schedule(
  'llm-cache-enforce-cap',
  '0 4 * * 0',
  $$
  delete from public.llm_cache
  where id in (
    select id
    from public.llm_cache
    order by last_hit_at asc nulls first, created_at asc
    limit greatest(0, (select count(*) from public.llm_cache) - 50000)
  )
  $$
);

-- 10. Grant necessary permissions
grant usage on schema public to service_role;
grant all on public.llm_cache to service_role;
grant execute on function public.match_llm_cache to service_role;
grant execute on function public.record_cache_hit to service_role;
```

### Rollback Migration

```sql
-- Rollback: Drop LLM cache and related objects
select cron.unschedule('llm-cache-cleanup-expired');
select cron.unschedule('llm-cache-enforce-cap');

drop trigger if exists llm_cache_updated_at_trigger on public.llm_cache;
drop function if exists public.update_updated_at_column();
drop function if exists public.match_llm_cache;
drop function if exists public.record_cache_hit;
drop table if exists public.llm_cache;
```

---

## Quick Reference: The Cache Flow

```
Incoming JD text
       |
       v
[1] Compute SHA-256 hash ──> Exact match in llm_cache? ──YES──> Return cached response
       |                                                          (no embedding needed)
       NO
       |
       v
[2] Generate embedding via text-embedding-3-small (~150ms)
       |
       v
[3] SELECT from llm_cache WHERE cosine_distance < 0.05 ──HIT──> Return cached response
       |                                                          (~2-5ms query)
       MISS
       |
       v
[4] Call LLM for normalization (~2-10 sec, ~$0.01-0.10)
       |
       v
[5] INSERT into llm_cache (embedding, hash, response)
       |
       v
[6] Return LLM response
```

---

## Sources

- [pgvector GitHub repository](https://github.com/pgvector/pgvector)
- [pgvector-python GitHub repository](https://github.com/pgvector/pgvector-python)
- [Supabase pgvector documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase AI & Vectors guide](https://supabase.com/docs/guides/ai)
- [Storing OpenAI embeddings in Postgres with pgvector (Supabase blog)](https://supabase.com/blog/openai-embeddings-postgres-vector)
- [Supabase Row Level Security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [pgvector <=> is cosine distance, not cosine similarity (Supabase issue #12244)](https://github.com/supabase/supabase/issues/12244)
- [AWS: Deep dive into IVFFlat and HNSW techniques](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/)
- [Tembo: Vector Indexes in Postgres using pgvector](https://legacy.tembo.io/blog/vector-indexes-in-pgvector/)
- [pgvector HNSW vs IVFFlat comprehensive study](https://medium.com/@bavalpreetsinghh/pgvector-hnsw-vs-ivfflat-a-comprehensive-study-21ce0aaab931)
- [Semantic Caching for LLM Apps (Percona)](https://www.percona.com/blog/semantic-caching-for-llm-apps-reduce-costs-by-40-80-and-speed-up-by-250x/)
- [GPT Semantic Cache: Reducing LLM Costs via Embedding Caching (arXiv)](https://arxiv.org/html/2411.05276v1)
- [Supabase vecs Python client](https://github.com/supabase/vecs)
- [pgvector: Key features, tutorial, and pros and cons (2026 guide)](https://www.instaclustr.com/education/vector-database/pgvector-key-features-tutorial-and-pros-and-cons-2026-guide/)
- [Neon: Don't use vector, use halfvec](https://neon.com/blog/dont-use-vector-use-halvec-instead-and-save-50-of-your-storage-cost)
