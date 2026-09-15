// Main workflow — Node 07 "Build Answer Context"
// Type: Code (Run Once for All Items)
//
// Concatenates the top KB hits into a bounded context block and
// drops very weak matches. Node 06's error output also lands
// here (On Error: Continue, error output wired to this node),
// which is why we filter out items with an `error` key.

const cls = $('Validate Classification').first().json;
const raw = $input.all();

const hits     = raw.filter(i => !i.json.error && i.json.id != null).map(i => i.json);
const kbFailed = raw.length > 0 && raw[0].json.error != null;

// Natural-language-mode relevance is unbounded and corpus-
// dependent, so this is a relative cutoff, not an absolute score.
const topScore = hits.length ? Number(hits[0].relevance) : 0;
const kept = hits.filter(h => topScore > 0 && Number(h.relevance) >= topScore * 0.15);

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
    context,
  },
}];
