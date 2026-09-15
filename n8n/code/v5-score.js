// Eval — Classification workflow — Node V5 "Score"
// Type: Code (Run Once for All Items)
//
// Uses pairedItem to match each response back to its source
// label, so batching in V4 doesn't desync the pairing.

const ALLOWED_CATEGORIES = new Set([
  'registration','billing','exams','library',
  'records','it-support','financial-aid','general',
]);
const ALLOWED_PRIORITIES = new Set(['low','normal','high','urgent']);

const labels    = $('Parse Labels').all();
const responses = $input.all();

function sourceIndex(item, fallback) {
  const p = item.pairedItem;
  if (typeof p === 'number') return p;
  if (p && typeof p.item === 'number') return p.item;
  return fallback;
}

const out = [];

for (let i = 0; i < responses.length; i++) {
  const srcIdx = sourceIndex(responses[i], i);
  const label  = (labels[srcIdx] ?? labels[i])?.json;
  if (!label) continue;

  const raw = responses[i].json;

  let parsed = null;
  let parse_error = null;

  if (raw?.error) {
    parse_error = `http: ${raw.error.message ?? 'failed'}`;
  } else {
    try {
      const content = raw?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('no content');
      const cleaned = content
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      parse_error = `parse: ${err.message}`;
    }

    if (parsed) {
      if (!ALLOWED_CATEGORIES.has(parsed.category)) {
        parse_error = `bad category: ${parsed.category}`;
        parsed = null;
      } else if (!ALLOWED_PRIORITIES.has(parsed.priority)) {
        parse_error = `bad priority: ${parsed.priority}`;
        parsed = null;
      }
    }
  }

  out.push({
    json: {
      id:                label.id,
      question:          label.question,
      expected_category: label.expected_category,
      expected_priority: label.expected_priority,
      actual_category:   parsed?.category ?? null,
      actual_priority:   parsed?.priority ?? null,
      confidence:        parsed?.confidence ?? null,
      reasoning:         parsed?.reasoning ?? null,
      correct:           parsed?.category === label.expected_category,
      priority_correct:  parsed?.priority === label.expected_priority,
      parse_error,
    },
  });
}

return out;
