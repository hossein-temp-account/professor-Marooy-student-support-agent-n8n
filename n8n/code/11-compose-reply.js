// Main workflow — Node 11 "Compose Reply"
// Type: Code (Run Once for All Items)

const d = $input.first().json;

return [{
  json: {
    ticket_id: d.ticket_id,
    category:  d.category,
    priority:  d.priority,
    status:    d.answered ? 'answered' : 'failed',
    answer:    d.answer,
    sources:   d.matched_kb_ids,
  },
}];
