#!/usr/bin/env python3
"""
Analyze the quality of training data and embeddings.
Shows what Ollama sees and whether it's useful.

Usage:
  python3 scripts/analyze_training_data.py
  python3 scripts/analyze_training_data.py --channel "SocialStoic"
  python3 scripts/analyze_training_data.py --sample          # Show sample chunks
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path


def analyze_transcripts(channel: str = None):
    """Analyze quality of raw transcripts."""
    transcripts_dir = Path("training-data/transcripts")
    
    if channel:
        transcripts_dir = transcripts_dir / channel
    
    if not transcripts_dir.exists():
        print(f"❌ Transcripts directory not found: {transcripts_dir}")
        return
    
    # Find all .txt files
    txt_files = list(transcripts_dir.glob("**/*.txt"))
    
    if not txt_files:
        print(f"No transcript files found in {transcripts_dir}")
        return
    
    print(f"📊 Analyzing {len(txt_files)} transcript files...")
    print("")
    
    stats = {
        "total_files": len(txt_files),
        "total_chars": 0,
        "total_words": 0,
        "avg_file_size": 0,
        "files_with_inaudible": 0,
        "files_with_noise": 0,
        "common_filler_words": Counter(),
        "sample_quality_issues": [],
    }
    
    for txt_file in txt_files:
        try:
            content = txt_file.read_text(encoding="utf-8")
            stats["total_chars"] += len(content)
            stats["total_words"] += len(content.split())
            
            # Check for common issues
            if "[INAUDIBLE]" in content:
                stats["files_with_inaudible"] += 1
            if "[NOISE]" in content:
                stats["files_with_noise"] += 1
            
            # Count filler words
            fillers = re.findall(r"\b(?:um|uh|like|you know|basically)\b", content, re.I)
            stats["common_filler_words"].update(fillers)
            
            # Sample problematic lines
            if "[INAUDIBLE]" in content or len(content) < 100:
                stats["sample_quality_issues"].append(txt_file.name)
        
        except Exception as e:
            print(f"⚠️  Error reading {txt_file.name}: {e}")
    
    stats["avg_file_size"] = stats["total_chars"] // stats["total_files"] if stats["total_files"] > 0 else 0
    
    # Print results
    print(f"Total Files:        {stats['total_files']}")
    print(f"Total Characters:   {stats['total_chars']:,}")
    print(f"Total Words:        {stats['total_words']:,}")
    print(f"Avg File Size:      {stats['avg_file_size']:,} chars")
    print(f"Files with [INAUDIBLE]: {stats['files_with_inaudible']}")
    print(f"Files with [NOISE]:     {stats['files_with_noise']}")
    print("")
    
    if stats["common_filler_words"]:
        print("Top Filler Words:")
        for word, count in stats["common_filler_words"].most_common(5):
            print(f"  {word}: {count}")
        print("")
    
    if stats["sample_quality_issues"]:
        print("Files Needing Review:")
        for fname in stats["sample_quality_issues"][:5]:
            print(f"  - {fname}")
        if len(stats["sample_quality_issues"]) > 5:
            print(f"  ... and {len(stats['sample_quality_issues']) - 5} more")


def analyze_chunks(sample: bool = False):
    """Analyze the chunked training data."""
    processed_file = Path("training-data/processed/training_data.jsonl")
    
    if not processed_file.exists():
        print(f"❌ Training data file not found: {processed_file}")
        return
    
    print(f"📊 Analyzing training data chunks...")
    print("")
    
    chunks = []
    try:
        with open(processed_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    chunks.append(json.loads(line))
    except Exception as e:
        print(f"❌ Error reading training data: {e}")
        return
    
    # Analyze
    stats = {
        "total_chunks": len(chunks),
        "total_chars": sum(len(c.get("content", "")) for c in chunks),
        "avg_chunk_size": 0,
        "sources": Counter(),
    }
    
    for chunk in chunks:
        source = chunk.get("source", "unknown")
        stats["sources"][source] += 1
    
    stats["avg_chunk_size"] = stats["total_chars"] // stats["total_chunks"] if chunks else 0
    
    print(f"Total Chunks:       {stats['total_chunks']:,}")
    print(f"Total Characters:   {stats['total_chars']:,}")
    print(f"Avg Chunk Size:     {stats['avg_chunk_size']} chars")
    print("")
    
    print("Chunks per Source:")
    for source, count in stats["sources"].most_common(10):
        pct = (count / stats["total_chunks"] * 100)
        print(f"  {source}: {count:,} ({pct:.1f}%)")
    
    if sample and chunks:
        print("")
        print("Sample Chunks:")
        import random
        for chunk in random.sample(chunks, min(3, len(chunks))):
            source = chunk.get("source", "unknown")
            content = chunk.get("content", "")[:150].replace("\n", " ")
            print(f"  📄 {source}")
            print(f"     {content}...")


def analyze_embeddings():
    """Check if embeddings exist in Supabase."""
    print("🔍 Checking Supabase embeddings...")
    print("")
    
    try:
        # This requires SUPABASE_URL and SUPABASE_KEY
        import os
        from supabase import create_client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        
        if not url or not key:
            print("⚠️  Supabase credentials not found. Skipping embedding check.")
            return
        
        supabase = create_client(url, key)
        
        # Try to count rows
        result = supabase.table("embeddings").select("id", count="exact").limit(1).execute()
        count = result.count if hasattr(result, "count") else "unknown"
        
        print(f"✅ Embeddings in Supabase: {count}")
    
    except ImportError:
        print("⚠️  Supabase library not installed. Skipping.")
    except Exception as e:
        print(f"⚠️  Could not check Supabase: {e}")


def main():
    parser = argparse.ArgumentParser(description="Analyze training data quality")
    parser.add_argument("--channel", help="Analyze specific channel")
    parser.add_argument("--sample", action="store_true", help="Show sample chunks")
    
    args = parser.parse_args()
    
    print("")
    print("=" * 60)
    print("TRAINING DATA QUALITY ANALYSIS")
    print("=" * 60)
    print("")
    
    # Analyze transcripts
    print("1️⃣  TRANSCRIPTS")
    print("-" * 60)
    analyze_transcripts(args.channel)
    
    print("")
    print("2️⃣  CHUNKED DATA")
    print("-" * 60)
    analyze_chunks(args.sample)
    
    print("")
    print("3️⃣  EMBEDDINGS")
    print("-" * 60)
    analyze_embeddings()
    
    print("")
    print("=" * 60)
    print("Analysis complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
