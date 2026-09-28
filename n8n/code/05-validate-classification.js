// Node 05 "Validate Classification" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

const ALLOWED_CATEGORIES = new Set(['registration','billing','exams','library','records','it-support','financial-aid','general']);
const ALLOWED_PRIORITIES = new Set(['low','normal','high','urgent']);

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return "'" + escaped + "'";
}

const upstream = $('Insert Ticket').first().json;
const norm     = $('Normalize Input').first().json;
const raw      = $input.first().json;

let parsed = null;
let failureReason = null;

if (raw && raw.error) {
  failureReason = `http: ${raw.error.message ?? 'request failed'}`;
} else {
  try {
    const content = raw?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('No message content in response');
    let cleaned = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);  // tolerate text around the JSON
    if (m) cleaned = m[0];
    parsed = JSON.parse(cleaned);
  } catch (err) {
    failureReason = `parse: ${err.message}`;
  }
  if (parsed) {
    if (!ALLOWED_CATEGORIES.has(parsed.category)) { failureReason = `bad category: ${parsed.category}`; parsed = null; }
    else if (!ALLOWED_PRIORITIES.has(parsed.priority)) { failureReason = `bad priority: ${parsed.priority}`; parsed = null; }
    else if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) { failureReason = `bad confidence: ${parsed.confidence}`; parsed = null; }
  }
}

const question = norm.question;
const kb_search_sql = `SELECT
  id,
  title,
  content,
  category,
  MATCH(title, content, keywords)
    AGAINST (${sqlEscape(question)} IN NATURAL LANGUAGE MODE) AS relevance
FROM knowledge_base
WHERE is_active = 1
  AND MATCH(title, content, keywords)
      AGAINST (${sqlEscape(question)} IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC
LIMIT 5;`;

return [{ json: {
  ticket_id:       upstream.insertId,
  question,
  category:        parsed ? parsed.category   : 'general',
  priority:        parsed ? parsed.priority   : 'normal',
  confidence:      parsed ? parsed.confidence : 0,
  reasoning:       parsed ? parsed.reasoning  : null,
  classified:      Boolean(parsed),
  failure:         failureReason,
  idempotency_key: norm.idempotency_key,
  kb_search_sql,
}}];