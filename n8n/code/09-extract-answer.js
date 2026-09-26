// Main workflow — Node 09 "Extract Answer"
// Type: Code (Run Once for All Items)
//
// Reached only via node 07b's "true" branch, i.e.
// `sufficient_knowledge === true` — there IS reliable KB context,
// so the AI is allowed to speak. The "false" branch runs node 09b
// instead and never calls the answer LLM at all.
//
// Pulls the answer text out of node 08's OpenRouter response.
// Node 08 has On Error: Continue so a failure lands here with
// an `error` key instead of a choices array. A failure on this
// branch still means no trustworthy answer went out, so it's
// marked 'failed' — it does not silently claim success.

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
    status:     answered ? 'answered' : 'failed',
    model_used: raw?.model ?? null,
    usage:      raw?.usage ?? null,
  },
}];
