// Main workflow — Node 09 "Extract Answer"
// Type: Code (Run Once for All Items)
//
// Pulls the answer text out of node 08's OpenRouter response.
// Node 08 has On Error: Continue so a failure lands here with
// an `error` key instead of a choices array.

const ctx = $('Build Answer Context').first().json;
const raw = $input.first().json;

let answer;
let answered;

if (raw && raw.error) {
  answer   = 'We could not generate an answer for this request. A staff member will follow up.';
  answered = false;
} else {
  const content = raw?.choices?.[0]?.message?.content?.trim();
  answer   = content || 'We could not generate an answer for this request. A staff member will follow up.';
  answered = Boolean(content);
}

return [{
  json: {
    ...ctx,
    answer,
    answered,
    model_used: raw?.model ?? null,
    usage:      raw?.usage ?? null,
  },
}];
