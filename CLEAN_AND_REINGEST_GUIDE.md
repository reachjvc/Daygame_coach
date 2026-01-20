# Clean & Re-Ingest Pipeline

## What This Does

This process:
1. **Clears** all old, fragmented embeddings from Supabase
2. **Re-loads** all transcripts with **sentence-boundary chunking** (not raw character slicing)
3. **Generates** embeddings for all 1,500+ chunks
4. **Stores** clean embeddings back to Supabase

## Key Improvement

The new **sentence-boundary chunking** respects natural sentence and paragraph breaks, preventing fragmentation like:
```
Old (broken): "do. But people will only care about..."
New (correct): "But people will only care about your what if you explain your why..."
```

## How to Run

### Option 1: Use the API Endpoint (Easiest)
```bash
curl -X POST http://localhost:3000/api/admin/clean-and-reingest
```

This works because:
- Next.js automatically loads `.env.local`
- All environment variables are ready
- Progress logs to server console

### Option 2: Use the Bash Script (For Advanced Users)
```bash
cd /home/jonaswsl/projects/v0-ai-daygame-coach
bash scripts/clean_and_reingest.sh
```

**Prerequisites:**
- `npm` installed
- Ollama running with `nomic-embed-text` model
- `.env.local` in project root with Supabase credentials
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set

## Timeline

- **Clearing embeddings**: ~5 seconds
- **Loading & chunking transcripts**: ~10 seconds (1,557 chunks)
- **Generating embeddings**: ~20-40 minutes (depends on Ollama speed)
- **Storing to Supabase**: ~30 seconds

**Total:** ~20-40 minutes

## Monitoring Progress

Watch the server console for progress updates:
```
Step 1: Clearing old embeddings from Supabase...
✅ Old embeddings cleared

Step 2: Loading transcripts with sentence-boundary chunking...
✅ Loaded 1557 chunks

Step 3: Generating embeddings (processing serially for stability)...
  Progress: 50/1557
  Progress: 100/1557
  Progress: 150/1557
  ...
✅ All 1557 embeddings generated

Step 4: Storing to Supabase...
✅ Stored 1557 chunks
```

## What Changes After This

1. **Better Sources**: QA answers will show properly-chunked transcript excerpts
2. **No Fragmentation**: No more mid-sentence breaks in retrieved context
3. **Cleaner Metadata**: Source file names clearly identified
4. **API Response**: Includes `sources_summary` with file list

## Troubleshooting

**Error: "Ollama embedding failed"**
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Verify model: `ollama list | grep nomic`
- If Ollama is overloaded, the script will retry automatically

**Error: "Missing SUPABASE_URL"**
- Ensure `.env.local` exists in project root
- Check you have `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set
- Use the API endpoint approach (it auto-loads env vars)

**Script crashes mid-way**
- It's safe to run again - it clears old data first
- The script will retry failed embeddings up to 3 times
- No partial data will be left in Supabase

## Files Modified

- **`transcript-loader.ts`**: New sentence-boundary chunking algorithm
- **`app/api/qa/route.ts`**: Response now includes `sources_summary`
- **`scripts/clean_and_reingest.sh`**: Orchestration script (bash)
- **`scripts/clean_and_reingest.mjs`**: Standalone Node.js script
- **`app/api/admin/clean-and-reingest/route.ts`**: API endpoint for easy triggering

## Next Steps After Re-ingesting

1. Test the QA endpoint: `curl -X POST http://localhost:3000/api/qa -H "Content-Type: application/json" -d '{"message": "your question here"}'`
2. Verify the `sources_summary` in the response shows files used
3. Optionally add more training data and re-run this process
