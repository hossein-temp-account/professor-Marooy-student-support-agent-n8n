INSERT INTO ticket_requests
  (student_name, student_email, student_id, channel, idempotency_key, question, status)
VALUES (?, ?, ?, ?, ?, ?, 'new')
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
