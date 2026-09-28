// Node 11 "Compose Reply" -- Code node (Run Once for All Items)
// Kept in sync with n8n/workflow-export.json. Edit the node in n8n, then re-export.

// Both branches converge on Update Ticket -> Compose Reply, but only ONE of
// 'Extract Answer' (KB match -> LLM) or 'No KB Match' (escalated) runs.
// Notes:
//  - Referencing a node that didn't run throws, so each lookup is guarded.
//  - Do NOT read from 'Check KB Match' here: it is an IF node with two
//    outputs and $('Check KB Match').first() returns undefined when the
//    branch can't be resolved. 'Build Answer Context' has one output and
//    carries the same fields.
function getJson(name) {
  try {
    const item = $(name).first();
    return item ? item.json : null;
  } catch (e) {
    return null;                       // node didn't run in this execution
  }
}

const n   = getJson('Normalize Input') ?? {};
const ctx = getJson('Build Answer Context') ?? {};

const d = ctx.sufficient_knowledge
  ? (getJson('Extract Answer') ?? getJson('No KB Match'))
  : (getJson('No KB Match')    ?? getJson('Extract Answer'));

if (!d) throw new Error('Compose Reply: neither Extract Answer nor No KB Match produced output');

const ticketCode = 'REQ-' + String(n.idempotency_key || '').slice(0, 8).toUpperCase();
const status = d.answered ? 'auto_resolved' : 'waiting_for_human';

return [{ json: {
  ticket_code: ticketCode,
  ticket_id:   ticketCode,
  category:    d.category,
  priority:    d.priority,
  status,
  answer:      d.answer,
  sources:     d.matched_kb_ids ?? [],
  // debug: remove once tuned
  debug: {
    reason:     ctx.insufficient_reason,
    top_score:  ctx.top_score,
    all_scores: ctx.all_scores,
    threshold:  ctx.kb_threshold,
    confidence: ctx.confidence,
    classified: ctx.classified,
    failure:    ctx.failure,
  },
}}];
