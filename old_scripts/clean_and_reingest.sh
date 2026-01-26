#!/bin/bash

# Clean and Re-ingest Training Data
# This script:
# 1. Clears all old fragmented chunks from Supabase
# 2. Re-ingests ALL transcripts with the new sentence-boundary chunking
# 3. Regenerates embeddings for all chunks

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "=========================================="
echo "🧹 CLEAN & RE-INGEST PIPELINE"
echo "=========================================="
echo ""

# Step 1: Clear old embeddings from Supabase
echo "Step 1: Clearing old embeddings from Supabase..."
npx tsx --env-file=.env.local << 'EOF'
import { supabaseAdmin } from "./supabase-admin";

async function clearOldEmbeddings() {
  console.log("Deleting all rows from embeddings table...");
  const { error } = await supabaseAdmin.from("embeddings").delete().neq("id", "0");
  
  if (error) {
    console.error("Error deleting embeddings:", error);
    process.exit(1);
  }
  
  console.log("✅ Embeddings table cleared");
}

clearOldEmbeddings();
EOF

echo ""

# Step 2: Load and chunk transcripts with NEW chunking algorithm
echo "Step 2: Loading transcripts and generating chunks with sentence-boundary chunking..."
npx tsx --env-file=.env.local << 'EOF'
import { loadAndChunkTranscripts } from "./transcript-loader";

async function generateChunks() {
  console.log("Loading and chunking transcripts...");
  const chunks = await loadAndChunkTranscripts();
  console.log(`✅ Generated ${chunks.length} chunks from transcripts`);
  console.log(`   (These use sentence-boundary chunking, not raw character slicing)`);
  return chunks;
}

const chunks = await generateChunks();
EOF

echo ""

# Step 3: Generate embeddings and store
echo "Step 3: Generating embeddings and storing to Supabase..."
npx tsx --env-file=.env.local << 'EOF'
import { loadAndChunkTranscripts } from "./transcript-loader";
import { generateEmbedding } from "./ollama-client";
import { storeChunks } from "./vector-store";

async function generateEmbeddingWithRetry(text, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`  ⚠️ Embedding failed (attempt ${attempt}/${maxRetries}), retrying in 3 seconds...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function ingestAll() {
  console.log("Loading transcripts...");
  let chunks = await loadAndChunkTranscripts();
  console.log(`Loaded ${chunks.length} chunks`);

  console.log("\nGenerating embeddings (processing serially for stability)...");
  console.log("(If errors occur, they will be retried automatically)");
  console.log(`(This will take 20-40 minutes for ${chunks.length} chunks)\n`);
  
  for (let i = 0; i < chunks.length; i++) {
    if (i % 50 === 0) {
      console.log(`  Progress: ${i}/${chunks.length} embeddings generated`);
    }
    chunks[i].embedding = await generateEmbeddingWithRetry(chunks[i].content);
  }
  
  console.log(`✅ All ${chunks.length} embeddings generated`);

  console.log("\nStoring to Supabase...");
  await storeChunks(chunks);
  console.log("✅ All chunks stored successfully");
}

ingestAll().catch(error => {
  console.error("Error during ingestion:", error);
  process.exit(1);
});
EOF

echo ""
echo "=========================================="
echo "✅ CLEAN & RE-INGEST COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Old fragmented chunks: DELETED from Supabase"
echo "  • New chunks: Generated with sentence-boundary chunking"
echo "  • Embeddings: Regenerated for all chunks"
echo "  • Storage: All data stored to Supabase embeddings table"
echo ""
echo "The QA system is now using clean, properly-chunked data."
echo ""
