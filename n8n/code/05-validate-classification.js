// Main workflow — Node 05 "Validate Classification"
// Type: Code (Run Once for All Items)
//
// Authoritative gate on node 04's output. The json_schema flag
// is a request to the provider, not a guarantee. Node 04's error
// output also lands here (On Error: Continue, error output
// wired to this node), which is why we check for raw.error.

const ALLOWED_CATEGORIES = new Set([
  'registration','billing','exams','library',
  'records','it-support','financial-aid','general',
]);
const ALLOWED_PRIORITIES = new Set(['low','normal','high','urgent']);

const upstream = $('Insert Ticket').first().json;
const raw      = $input.first().json;

let parsed        = null;
let failureReason = null;

if (raw && raw.error) {
  failureReason = `http: ${raw.error.message ?? 'request failed'}`;
} else {
  try {
    const content = raw?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('No message content in response');
    }
    const cleaned = content
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    failureReason = `parse: ${err.message}`;
  }

  if (parsed) {
    if (!ALLOWED_CATEGORIES.has(parsed.category)) {
      failureReason = `bad category: ${parsed.category}`;
      parsed = null;
    } else if (!ALLOWED_PRIORITIES.has(parsed.priority)) {
      failureReason = `bad priority: ${parsed.priority}`;
      parsed = null;
    } else if (typeof parsed.confidence !== 'number'
               || parsed.confidence < 0 || parsed.confidence > 1) {
      failureReason = `bad confidence: ${parsed.confidence}`;
      parsed = null;
    }
  }
}

return [{
  json: {
    ticket_id:  upstream.insertId,
    question:   upstream.question,
    category:   parsed ? parsed.category   : 'general',
    priority:   parsed ? parsed.priority   : 'normal',
    confidence: parsed ? parsed.confidence : 0,
    reasoning:  parsed ? parsed.reasoning  : null,
    classified: Boolean(parsed),
    failure:    failureReason,
  },
}];
