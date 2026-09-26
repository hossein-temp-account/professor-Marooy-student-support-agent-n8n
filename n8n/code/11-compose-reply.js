// Main workflow — Node 11 "Compose Reply"
// Type: Code (Run Once for All Items)
<<<<<<< HEAD
//
// Common exit point for both the answer branch (09) and the
// human-escalation branch (09b) — both set `status` and `answer`
// themselves, so this node just shapes the final JSON body node
// 12 sends back to the student's browser.
=======
>>>>>>> origin/main

const d = $input.first().json;

return [{
  json: {
    ticket_id: d.ticket_id,
    category:  d.category,
    priority:  d.priority,
<<<<<<< HEAD
    status:    d.status,
    answer:    d.answer,
    sources:   d.matched_kb_ids ?? [],
=======
    status:    d.answered ? 'answered' : 'failed',
    answer:    d.answer,
    sources:   d.matched_kb_ids,
>>>>>>> origin/main
  },
}];
