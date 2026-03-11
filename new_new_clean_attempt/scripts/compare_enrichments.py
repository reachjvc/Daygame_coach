#!/usr/bin/env python3
"""Compare old pipeline enrichment with new Stage B enrichment."""

import json
import sys
import glob


def load_json(path):
    with open(path) as f:
        raw = json.load(f)
    # Handle Claude --output-format json wrapper
    if isinstance(raw, dict) and 'result' in raw:
        result_str = raw['result']
        start = result_str.index('{')
        end = result_str.rindex('}') + 1
        return json.loads(result_str[start:end])
    return raw


def extract_techniques(enrichments):
    """Extract all technique mentions from enrichments."""
    techniques = {}
    for e in enrichments:
        for t in e.get('techniques_used', []):
            name = t.get('technique', t) if isinstance(t, dict) else t
            if isinstance(t, dict):
                techniques[name] = {
                    'evidence_strength': t.get('evidence_strength', 'unknown'),
                    'segment_id': t.get('segment_id', t.get('segment', '?')),
                    'quote': t.get('quote', t.get('example', '')),
                }
            else:
                techniques[name] = {'evidence_strength': 'unknown'}
        for t in e.get('techniques_discussed', []):
            name = t.get('technique', t) if isinstance(t, dict) else t
            if name not in techniques:
                techniques[name] = {'evidence_strength': 'discussed'}
    return techniques


def extract_topics(enrichments):
    """Extract all topics from enrichments."""
    topics = set()
    for e in enrichments:
        for t in e.get('topics_discussed', []):
            topics.add(t)
    return topics


def main(old_enrichment_path, new_enrichment_path, old_verify_path=None):
    old = load_json(old_enrichment_path)
    new = load_json(new_enrichment_path)

    old_enrichments = old.get('enrichments', [])
    new_enrichments = new.get('enrichments', [])

    print(f"Old pipeline: {len(old_enrichments)} enrichments")
    print(f"New Stage B:  {len(new_enrichments)} enrichments")
    print()

    # Extract techniques
    old_techniques = extract_techniques(old_enrichments)
    new_techniques = extract_techniques(new_enrichments)

    # Also check techniques_discussed_negatively in new
    new_negative = {}
    for e in new_enrichments:
        for t in e.get('techniques_discussed_negatively', []):
            name = t.get('technique', t) if isinstance(t, dict) else t
            new_negative[name] = t if isinstance(t, dict) else {}

    print("=== TECHNIQUE COMPARISON ===")
    all_techniques = sorted(set(list(old_techniques.keys()) + list(new_techniques.keys()) + list(new_negative.keys())))
    for tech in all_techniques:
        old_ev = old_techniques.get(tech, {}).get('evidence_strength', '-')
        new_ev = new_techniques.get(tech, {}).get('evidence_strength', '-')
        neg = '(NEGATIVE)' if tech in new_negative else ''

        if tech in old_techniques and tech not in new_techniques and tech not in new_negative:
            status = "OLD ONLY"
        elif tech not in old_techniques and tech in new_techniques:
            status = "NEW ONLY"
        elif tech in new_negative and tech in old_techniques:
            status = "OLD=yes, NEW=negative"
        elif tech in old_techniques and tech in new_techniques:
            status = "BOTH"
        elif tech in new_negative:
            status = "NEW NEGATIVE ONLY"
        else:
            status = "???"

        print(f"  {tech:30s} | {status:25s} | old_ev={old_ev:12s} | new_ev={new_ev:12s} {neg}")
    print()

    # Extract topics
    old_topics = extract_topics(old_enrichments)
    new_topics = extract_topics(new_enrichments)

    print("=== TOPIC COMPARISON ===")
    all_topics = sorted(old_topics | new_topics)
    for topic in all_topics:
        in_old = "yes" if topic in old_topics else "no"
        in_new = "yes" if topic in new_topics else "no"
        status = "BOTH" if in_old == "yes" and in_new == "yes" else f"{'OLD' if in_old == 'yes' else 'NEW'} ONLY"
        print(f"  {topic:30s} | {status}")
    print()

    # Self-verification
    sv = new.get('self_verification', {})
    if sv:
        print("=== NEW STAGE B SELF-VERIFICATION ===")
        for c in sv.get('corrections_made', []):
            print(f"  CORRECTION: {c}")
        for c in sv.get('remaining_concerns', []):
            print(f"  CONCERN: {c}")
    print()

    # If we have the old verify file, show what it caught
    if old_verify_path:
        verify = load_json(old_verify_path)
        print("=== OLD 07b VERIFICATION ISSUES ===")
        for issue in verify.get('issues', []):
            print(f"  [{issue.get('issue_severity', '?')}] {issue.get('issue_code', '?')}: {issue.get('message', '')[:100]}")
        print(f"  Gate decision: {verify.get('gate_decision', '?')}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: compare_enrichments.py <old_enriched.json> <new_stage_b.json> [old_verify.json]")
        sys.exit(1)

    old_verify = sys.argv[3] if len(sys.argv) > 3 else None
    main(sys.argv[1], sys.argv[2], old_verify)
