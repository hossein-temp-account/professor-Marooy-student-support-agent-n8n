// Node 07 "Build Answer Context" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

// Node 07 "Build Answer Context"
// Search Knowledge Base has alwaysOutputData=true, so when MySQL finds
// zero rows this node still receives one EMPTY item ({}), which is
// filtered out below (no id) -> hits = [] -> sufficient_knowledge=false
// -> the workflow goes to "No KB Match" and the ticket is escalated.
// Tuning knob: minimum MySQL relevance score to auto-answer.
// Set here instead of reading $env, because N8N_BLOCK_ENV_ACCESS_IN_NODE
// is on and blocks $env inside Code nodes. Edit this number to tune it
// against your own knowledge_base content (see BUILD.md).
// InnoDB relevance scores are corpus-relative and low on a small KB:
// clear matches score ~2-10, off-topic questions ~0-1. 4.0 rejected valid
// questions, so the cutoff is 1.5. The answer LLM is instructed to say
// "not covered" if the excerpts don't actually contain the answer.
// InnoDB relevance scores are corpus-relative (tiny on a small KB), so an
// absolute cutoff kept rejecting valid questions. The SQL already requires
// MATCH(...) > 0, so "at least one hit" is the real gate; this is only a floor.
// The answer LLM is instructed to say "not covered" if the excerpts don't
// contain the answer, so a weak hit can't produce an invented answer.
const KB_MATCH_THRESHOLD = 0.05;
// Classification is metadata. Only block if the classifier ran successfully
// AND is clearly unsure; a failed/unparsable classification must not block.
const MIN_CLASS_CONFIDENCE = 0.3;

const cls = $('Validate Classification').first().json;
const raw = $input.all();

const hits     = raw.filter(i => !i.json.error && i.json.id != null).map(i => i.json);
const kbFailed = raw.length > 0 && raw[0].json.error != null;

const scoreOf  = h => { const n = Number(h.relevance); return Number.isFinite(n) ? n : 0; };
const scores   = hits.map(scoreOf);
const topScore = scores.length ? scores[0] : 0;
// score unknown (0) but rows came back -> keep them all
const kept = topScore > 0 ? hits.filter(h => scoreOf(h) >= topScore * 0.15) : hits;

const scoreOk = topScore === 0 || topScore >= KB_MATCH_THRESHOLD;
const confOk  = !cls.classified || Number(cls.confidence) >= MIN_CLASS_CONFIDENCE;

const sufficient_knowledge = !kbFailed && kept.length > 0 && scoreOk && confOk;

let insufficient_reason = null;
if (!sufficient_knowledge) {
  if (kbFailed) insufficient_reason = 'kb_search_failed';
  else if (hits.length === 0) insufficient_reason = 'no_kb_hits';
  else if (!scoreOk) insufficient_reason = 'low_relevance';
  else insufficient_reason = 'low_classification_confidence';
}

const context = kept.map((h, i) => `[${i + 1}] ${h.title} (category: ${h.category})\n${h.content}`).join('\n\n').slice(0, 12000);
const userPrompt = 'Question:\n' + cls.question + '\n\nKnowledge-base excerpts:\n' + (context || '(no relevant excerpts found)');

return [{ json: {
  ticket_id:       cls.ticket_id,
  question:        cls.question,
  category:        cls.category,
  priority:        cls.priority,
  confidence:      cls.confidence,
  classified:      cls.classified,
  failure:         cls.failure,
  kb_failed:       kbFailed,
  matched_kb_ids:  kept.map(h => h.id),
  has_context:     kept.length > 0,
  sufficient_knowledge,
  insufficient_reason,
  top_score:       topScore,
  all_scores:      scores,
  kb_threshold:    KB_MATCH_THRESHOLD,
  context,
  user_prompt:     userPrompt,
  idempotency_key: cls.idempotency_key,
}}];
