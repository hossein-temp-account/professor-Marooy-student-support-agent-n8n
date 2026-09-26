// Main workflow — Node 07 "Build Answer Context"
// Type: Code (Run Once for All Items)
//
// Concatenates the top KB hits into a bounded context block and
// drops very weak matches. Node 06's error output also lands
// here (On Error: Continue, error output wired to this node),
// which is why we filter out items with an `error` key.
<<<<<<< HEAD
//
// `sufficient_knowledge` is the one decision the rest of the
// workflow trusts. Node 07b (an IF node) branches on it directly,
// so node 08 (the answer LLM) is structurally unreachable when
// this is false — not merely told to refuse in its prompt.
const KB_MATCH_THRESHOLD = Number($env.KB_MATCH_THRESHOLD ?? 4.0);
=======
>>>>>>> origin/main

const cls = $('Validate Classification').first().json;
const raw = $input.all();

const hits     = raw.filter(i => !i.json.error && i.json.id != null).map(i => i.json);
const kbFailed = raw.length > 0 && raw[0].json.error != null;

// Natural-language-mode relevance is unbounded and corpus-
// dependent, so this is a relative cutoff, not an absolute score.
const topScore = hits.length ? Number(hits[0].relevance) : 0;
const kept = hits.filter(h => topScore > 0 && Number(h.relevance) >= topScore * 0.15);

<<<<<<< HEAD
// Absolute cutoff on top of the relative one above: this is the
// actual "is this reliable enough to auto-answer" gate.
// KB_MATCH_THRESHOLD is corpus-dependent — tune it against your
// own knowledge_base content and evals/classification_labels.jsonl,
// there's no universal correct value for a MySQL relevance score.
//
// A low classification confidence also forces human review even
// when the KB match looks fine, per the "ambiguous question" test
// case in the project brief.
const sufficient_knowledge =
  !kbFailed &&
  kept.length > 0 &&
  topScore >= KB_MATCH_THRESHOLD &&
  cls.confidence >= 0.70;

=======
>>>>>>> origin/main
const context = kept
  .map((h, i) => `[${i + 1}] ${h.title} (category: ${h.category})\n${h.content}`)
  .join('\n\n')
  .slice(0, 12000);   // hard cap so node 08 can't blow the context window

return [{
  json: {
    ticket_id:      cls.ticket_id,
    question:       cls.question,
    category:       cls.category,
    priority:       cls.priority,
    confidence:     cls.confidence,
    classified:     cls.classified,
    failure:        cls.failure,
    kb_failed:      kbFailed,
    matched_kb_ids: kept.map(h => h.id),
    has_context:    kept.length > 0,
<<<<<<< HEAD
    sufficient_knowledge,
=======
>>>>>>> origin/main
    context,
  },
}];
