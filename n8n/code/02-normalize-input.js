// Main workflow — Node 02 "Normalize Input"
// Type: Code (Run Once for All Items)
//
// Trim, lowercase email, reject empty questions, derive an
// idempotency key. Prefers a client-supplied X-Idempotency-Key
// header; falls back to SHA-256 over the normalized payload.
//
// NOTE: require('crypto') works in the default Code node runner.
// With N8N_RUNNERS_ENABLED=true, builtin access may be blocked
// depending on task-runner config. If this throws, see BUILD.md.

const crypto = require('crypto');

const out = [];

for (const item of $input.all()) {
  const b    = item.json.body ?? item.json;
  const hdrs = item.json.headers ?? {};

  const question = String(b.question ?? '').trim();
  if (question.length === 0) {
    throw new Error('Missing required field: question');
  }
  if (question.length > 4000) {
    throw new Error('Question exceeds 4000 characters');
  }

  const email = String(b.student_email ?? '').trim().toLowerCase();

  const supplied = String(hdrs['x-idempotency-key'] ?? '').trim();
  const idempotency_key = supplied.length > 0 && supplied.length <= 64
    ? supplied
    : crypto
        .createHash('sha256')
        .update(`${email}|${String(b.student_id ?? '').trim()}|${question}`)
        .digest('hex')
        .slice(0, 64);

  out.push({
    json: {
      student_name:    String(b.student_name ?? '').trim() || null,
      student_email:   email || null,
      student_id:      String(b.student_id   ?? '').trim() || null,
      channel:         'webhook',
      idempotency_key,
      question,
      received_at:     new Date().toISOString(),
    },
  });
}

return out;
