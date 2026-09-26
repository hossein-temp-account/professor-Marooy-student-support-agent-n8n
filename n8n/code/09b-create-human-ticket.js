// Main workflow — Node 09b "Create Human Ticket"
// Type: Code (Run Once for All Items)
//
// Reached only via node 07b's "false" branch, i.e.
// `sufficient_knowledge === false`. Node 08 (the answer LLM) is
// never called on this path — there is no AI-generated text here
// that could hallucinate a policy, deadline, or fee. This node
// only composes the "your request has been registered" message.
//
// Detects Persian input with a simple Unicode range check so the
// acknowledgement is at least readable in the student's own
// language. A real deployment would add a language field to the
// classification schema (node 04) instead of guessing here.

const d = $('Build Answer Context').first().json;

const isPersian = /[\u0600-\u06FF]/.test(d.question || '');

const reason = d.kb_failed
  ? (isPersian
      ? 'در حال حاضر امکان جست‌وجو در پایگاه دانش وجود ندارد.'
      : 'The knowledge base could not be searched right now.')
  : (isPersian
      ? 'اطلاعات کافی برای پاسخ‌گویی خودکار به این درخواست در پایگاه دانش موجود نبود.'
      : 'No sufficiently reliable information was found in the knowledge base for this request.');

const message = isPersian
  ? `درخواست شما در سامانه ثبت شد.\n\nشماره تیکت: ${d.ticket_id}\n\n${reason} درخواست شما برای بررسی توسط کارشناس ثبت شد.`
  : `Your request has been registered.\n\nTicket ID: ${d.ticket_id}\n\n${reason} It has been forwarded for human review.`;

return [{
  json: {
    ...d,
    answer:     message,
    answered:   false,
    status:     'escalated',
    model_used: null,
    usage:      null,
  },
}];
