// Node 09 "Extract Answer" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return "'" + escaped + "'";
}

const ctx = $('Build Answer Context').first().json;
const raw = $input.first().json;

let answer, answered;
if (raw && raw.error) {
  answer = 'We could not generate an answer for this request. A staff member will follow up.';
  answered = false;
} else {
  const content = raw?.choices?.[0]?.message?.content?.trim();
  answer = content || 'We could not generate an answer for this request. A staff member will follow up.';
  answered = Boolean(content);
}

const status        = answered ? 'answered' : 'failed';
const errorMessage  = ctx.kb_failed ? 'kb search failed' : ctx.failure;
const matchedKbJson = JSON.stringify(ctx.matched_kb_ids ?? []);

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
  model_used: raw?.model ?? null,
  usage: raw?.usage ?? null,
  update_sql,
}}];