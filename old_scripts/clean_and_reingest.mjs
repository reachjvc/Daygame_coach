#!/usr/bin/env node
/**
 * Clean & Re-ingest Training Data
 * This script:
 * 1. Clears old embeddings from Supabase
 * 2. Loads transcripts with sentence-boundary chunking
 * 3. Generates embeddings via Ollama
 * 4. Stores to Supabase
 */

import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
}

import { loadAndChunkTranscripts } from "../transcript-loader.ts";
import { supabaseAdmin } from "../supabase-admin.ts";
import { QA_CONFIG } from "../config.ts";

const OLLAMA_BASE_URL = QA_CONFIG.ollama.baseUrl;
const EMBEDDING_MODEL = QA_CONFIG.ollama.embeddingModel;

async function generateEmbedding(text) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function generateEmbeddingWithRetry(text, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(
        `  ⚠️ Embedding failed (attempt ${attempt}/${maxRetries}), retrying in 3 seconds...`
      );
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function clearEmbeddings() {
  console.log("Step 1: Clearing old embeddings from Supabase...");
  const { error } = await supabaseAdmin
    .from("embeddings")
    .delete()
    .neq("id", "0");

  if (error) {
    throw new Error(`Failed to clear embeddings: ${error.message}`);
  }
  console.log("✅ Embeddings table cleared\n");
}

async function loadChunks() {
  console.log("Step 2: Loading transcripts with sentence-boundary chunking...");
  const chunks = await loadAndChunkTranscripts();
  console.log(`✅ Loaded ${chunks.length} chunks\n`);
  return chunks;
}

async function generateEmbeddings(chunks) {
  console.log("Step 3: Generating embeddings...");
  console.log(
    `(This may take 20-40 minutes for ${chunks.length} chunks)\n`
  );

  for (let i = 0; i < chunks.length; i++) {
    if (i % 50 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${chunks.length}`);
    }
    chunks[i].embedding = await generateEmbeddingWithRetry(chunks[i].content);
  }

  console.log(`✅ Generated ${chunks.length} embeddings\n`);
  return chunks;
}

async function storeChunks(chunks) {
  console.log("Step 4: Storing to Supabase...");

  const rows = chunks.map((chunk) => ({
    content: chunk.content,
    source: chunk.source,
    metadata: chunk.metadata,
    embedding: chunk.embedding,
  }));

  const { error } = await supabaseAdmin.from("embeddings").insert(rows);

  if (error) {
    throw new Error(`Failed to store chunks: ${error.message}`);
  }

  console.log(`✅ Stored ${rows.length} chunks\n`);
}

async function main() {
  console.log("==========================================");
  console.log("🧹 CLEAN & RE-INGEST PIPELINE");
  console.log("==========================================\n");

  try {
    await clearEmbeddings();
    const chunks = await loadChunks();
    const chunksWithEmbeddings = await generateEmbeddings(chunks);
    await storeChunks(chunksWithEmbeddings);

    console.log("==========================================");
    console.log("✅ CLEAN & RE-INGEST COMPLETE");
    console.log("==========================================\n");
    console.log("Summary:");
    console.log("  • Old fragmented chunks: DELETED from Supabase");
    console.log("  • New chunks: Generated with sentence-boundary chunking");
    console.log("  • Embeddings: Regenerated for all chunks");
    console.log("  • Storage: All data stored to Supabase\n");
    console.log("The QA system is now using clean, properly-chunked data.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  }
}

main();
