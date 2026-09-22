#!/bin/bash
# Session Audit Script
# Run this at end of Claude session to check what docs need updating
# Usage: ./scripts/audit-session.sh

echo "📋 SESSION AUDIT"
echo "================"
echo ""

# Check for modified files not yet committed
MODIFIED=$(git diff --name-only 2>/dev/null)
STAGED=$(git diff --cached --name-only 2>/dev/null)

ALL_CHANGES=$(echo -e "$MODIFIED\n$STAGED" | sort -u | grep -v '^$')

if [ -z "$ALL_CHANGES" ]; then
    echo "✅ No uncommitted changes found."
    exit 0
fi

echo "📝 Files modified this session:"
echo "$ALL_CHANGES" | sed 's/^/   /'
echo ""

# Check which slices were touched
SLICES_TOUCHED=$(echo "$ALL_CHANGES" | grep -oE 'src/(qa|inner-game|scenarios|tracking|profile|settings|db|articles)' | sort -u)

if [ -n "$SLICES_TOUCHED" ]; then
    echo "🔍 Slices touched:"
    echo "$SLICES_TOUCHED" | sed 's/^/   /'
    echo ""
    echo "📚 Docs that MAY need updating:"
    for slice in $SLICES_TOUCHED; do
        slice_name=$(echo "$slice" | sed 's|src/||')
        doc_path="docs/slices/SLICE_${slice_name^^}.md"
        if [ -f "$doc_path" ]; then
            echo "   → $doc_path"
        fi
    done
    echo ""
fi

# The doc-changelog check that stood here demanded today's date as DD-MM-YYYY,
# for a convention that no longer exists and in a format the project does not
# use. Removed 2026-09-22 alongside its twin in .husky/pre-commit.

# API routes check
API_ROUTES=$(echo "$ALL_CHANGES" | grep -E 'app/api.*route\.ts$')
if [ -n "$API_ROUTES" ]; then
    echo "🌐 API routes modified:"
    for route in $API_ROUTES; do
        lines=$(wc -l < "$route" 2>/dev/null || echo "?")
        if [ "$lines" -gt 50 ]; then
            echo "   ⚠️  $route ($lines lines - over 50 limit!)"
        else
            echo "   ✅ $route ($lines lines)"
        fi
    done
    echo ""
fi

echo "💡 Before ending session, ensure:"
echo "   1. All relevant docs are updated"
echo "   2. docs/known-failures.md answered against this session's work"
echo "   3. npm test passes"
