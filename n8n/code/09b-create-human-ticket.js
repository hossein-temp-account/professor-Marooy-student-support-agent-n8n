// Node 09b "No KB Match" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

// Runs only when Build Answer Context found nothing above the
// relevance cutoff (has_context === false). Skips the LLM call
// entirely and writes an explicit, honest 'not in the knowledge
// base' answer instead of letting the model improvise or return
// an empty/blank response.
function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return "'" + escaped + "'";
}

const ctx = $input.first().json;

const answer = "This question isn't covered in the knowledge base yet. Your request has been logged and a staff member will follow up directly.";
const answered = false;
const status = 'escalated';
const matchedKbJson = JSON.stringify(ctx.matched_kb_ids ?? []);
const errorMessage = `escalated: ${ctx.insufficient_reason ?? 'unknown'} (top_score=${ctx.top_score}, threshold=${ctx.kb_threshold}, confidence=${ctx.confidence})`;

const update_sql = `UPDATE ticket_requests
SET
  category       = ${sqlEscape(ctx.category)},
  priority       = ${sqlEscape(ctx.priority)},
  confidence     = ${sqlEscape(ctx.confidence)},
  status         = ${sqlEscape(status)},
  answer         = ${sqlEscape(answer)},
  matched_kb_ids = ${sqlEscape(matchedKbJson)},
  error_message  = ${sqlEscape(errorMessage)}
WHERE idempotency_key = ${sqlEscape(ctx.idempotency_key)};`;

return [{ json: {
  ...ctx,
  answer,
  answered,
  model_used: null,
  usage: null,
  update_sql,
}}];