// Node 02 "Normalize Input" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

// Escapes a JS value into a literal that is safe to inline directly
// into a MySQL statement string. Used because this n8n version's
// queryReplacement / "?" placeholder binding does not reliably work
// (confirmed across multiple attempts) -- so instead of parameter
// binding, we build the full, already-escaped SQL text here in JS,
// and the MySQL node downstream just executes that finished string
// via {{ $json.sql }}. No placeholders left for n8n to mishandle.
function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return "'" + escaped + "'";
}

function simpleHash(str) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 0x01000193);
    h2 ^= c; h2 = Math.imul(h2, 0x85ebca6b);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2).repeat(4).slice(0, 64);
}

const out = [];
for (const item of $input.all()) {
  const b    = item.json.body ?? item.json;
  const hdrs = item.json.headers ?? {};
  const question = String(b.question ?? '').trim();
  if (question.length === 0) throw new Error('Missing required field: question');
  if (question.length > 4000) throw new Error('Question exceeds 4000 characters');
  const email = String(b.student_email ?? '').trim().toLowerCase();
  const supplied = String(hdrs['x-idempotency-key'] ?? '').trim();
  const idempotency_key = supplied.length > 0 && supplied.length <= 64
    ? supplied
    : simpleHash(`${email}|${String(b.student_id ?? '').trim()}|${question}`);

  const student_name = String(b.student_name ?? '').trim() || null;
  const student_id   = String(b.student_id   ?? '').trim() || null;
  const channel       = 'webhook';

  const insert_sql = `INSERT INTO ticket_requests
  (student_name, student_email, student_id, channel, idempotency_key, question, status)
VALUES
  (${sqlEscape(student_name)}, ${sqlEscape(email || null)}, ${sqlEscape(student_id)}, ${sqlEscape(channel)}, ${sqlEscape(idempotency_key)}, ${sqlEscape(question)}, 'new')
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`;

  out.push({ json: {
    student_name,
    student_email: email || null,
    student_id,
    channel,
    idempotency_key,
    question,
    received_at: new Date().toISOString(),
    insert_sql,
  }});
}
return out;