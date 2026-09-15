// Error Handler workflow — Node E2 "Format Error"
// Type: Code (Run Once for All Items)

const d = $input.first().json;

const execution = d.execution ?? {};
const workflow  = d.workflow  ?? {};
const err       = execution.error ?? {};

let payload = null;
try {
  payload = JSON.stringify({
    lastNode: execution.lastNodeExecuted ?? null,
    mode:     execution.mode ?? null,
    retryOf:  execution.retryOf ?? null,
  });
} catch {
  payload = null;
}

return [{
  json: {
    workflow_name: workflow.name ?? '(unknown)',
    execution_id:  String(execution.id ?? ''),
    execution_url: execution.url ?? null,
    last_node:     execution.lastNodeExecuted ?? null,
    error_message: err.message ?? String(err),
    error_stack:   err.stack ?? null,
    payload,
  },
}];
