# Building the n8n workflows

The workflows are not committed as JSON. n8n's workflow export format
embeds node type version strings, UI positions, and credential
references that only make sense against the n8n version that produced
them. A hand-authored export imports as a broken graph more often than
not. Build in the UI, then **Workflows → Export** and commit the result
once it's verified.

This directory holds the parts that *do* transfer cleanly:

- `code/` — paste into Code nodes
- `sql/`  — paste into MySQL nodes
- `http/` — paste into HTTP Request node JSON bodies

## Credentials

Create both through the n8n UI. They are encrypted with
`N8N_ENCRYPTION_KEY` and never appear in a node parameter.

**MySQL** (type: MySQL)
| Field | Value |
|---|---|
| Host | `mysql` |
| Port | `3306` |
| Database | `support_agent` |
| User | value of `MYSQL_USER` in `.env` |
| Password | value of `MYSQL_PASSWORD` in `.env` |
| SSL | disabled |

Name it `MySQL - support_agent`.

**OpenRouter** (type: Header Auth)
| Field | Value |
|---|---|
| Name | `Authorization` |
| Value | `Bearer <your OpenRouter key>` |

Name it `OpenRouter`. Node 04, node 08, and eval node V4 all
reference it.

## Main workflow — `Student Support Agent`

| # | Node | Type | Key settings |
|---|---|---|---|
| 01 | Webhook | Webhook | POST, path `student-support`, Response Mode `Respond to Webhook` |
| 02 | Normalize Input | Code | `code/02-normalize-input.js` |
| 03 | Insert Ticket | MySQL | Execute SQL, `sql/03-insert-ticket.sql`, 6 params |
| 04 | Classify | HTTP Request | POST, `http/04-classify.json`, Header Auth `OpenRouter` |
| 05 | Validate Classification | Code | `code/05-validate-classification.js` |
| 06 | Search Knowledge Base | MySQL | Execute SQL, `sql/06-search-kb.sql`, 2 params |
| 07 | Build Answer Context | Code | `code/07-build-answer-context.js` |
| 08 | Generate Answer | HTTP Request | POST, `http/08-generate-answer.json`, Header Auth `OpenRouter` |
| 09 | Extract Answer | Code | `code/09-extract-answer.js` |
| 10 | Update Ticket | MySQL | Update, key `id` = `{{ $json.ticket_id }}` |
| 11 | Compose Reply | Code | `code/11-compose-reply.js` |
| 12 | Respond to Webhook | Respond to Webhook | JSON, body `{{ $json }}`, code 200 |

### Node 10 column map

| Column | Value |
|---|---|
| `category` | `{{ $json.category }}` |
| `priority` | `{{ $json.priority }}` |
| `confidence` | `{{ $json.confidence }}` |
| `status` | `{{ $json.answered ? 'answered' : 'failed' }}` |
| `answer` | `{{ $json.answer }}` |
| `matched_kb_ids` | `{{ JSON.stringify($json.matched_kb_ids) }}` |
| `error_message` | `{{ $json.kb_failed ? 'kb search failed' : $json.failure }}` |

`matched_kb_ids` must be a string. The driver will reject a raw
array.

### Error / retry policy

| Node | On Error | Retry | Wait | Timeout |
|---|---|---|---|---|
| 01 Webhook | Stop | 0 | — | — |
| 02 Normalize | Stop | 0 | — | — |
| 03 Insert | Stop | 3 | 1000ms | — |
| 04 Classify | Continue (error output) | 3 | 2000ms | 60000ms |
| 05 Validate | Stop | 0 | — | — |
| 06 Search KB | Continue (error output) | 2 | 1000ms | — |
| 07 Build Context | Stop | 0 | — | — |
| 08 Generate | Continue (error output) | 3 | 2000ms | 60000ms |
| 09 Extract | Stop | 0 | — | — |
| 10 Update | Stop | 3 | 1000ms | — |
| 11 Compose | Stop | 0 | — | — |
| 12 Respond | Stop | 0 | — | — |

Wire node 04's error output and node 06's error output into the same
downstream node that normally consumes their main output (05 and 07
respectively). n8n emits on only the branch that fired.

Then: **Workflow Settings → Error Workflow → `Error Handler`**.

## Error Handler workflow

| # | Node | Type | Notes |
|---|---|---|---|
| E1 | Error Trigger | ErrorTrigger | — |
| E2 | Format Error | Code | `code/e2-format-error.js` |
| E3 | Log to MySQL | MySQL | Insert into `error_log`, 8 columns from E2 |
| E4 | Alert | NoOp | Replace with Slack/email once failures are understood |

## Eval — Classification workflow

| # | Node | Type | Notes |
|---|---|---|---|
| V1 | Manual Trigger | ManualTrigger | — |
| V2 | Read Labels | Read Binary File | Path `/evals/classification_labels.jsonl`, property `data` |
| V3 | Parse Labels | Code | `code/v3-parse-labels.js` |
| V4 | Classify | HTTP Request | Same as node 04. Batching: size 3, interval 500ms |
| V5 | Score | Code | `code/v5-score.js` |
| V6 | Aggregate | Code | `code/v6-aggregate.js` |

Run V1. Read `summary.category_accuracy`, then `per_category`, then
`confusion`. The confusion matrix is what tells you what to change in
the prompt.

Baseline to beat with `openai/gpt-4o-mini` on this label set:
0.85–0.95 category accuracy. Below 0.80 means the prompt needs the
ambiguous cases called out by name. At 1.00 the set is too easy — add
adversarial rows before trusting the number.

## `require('crypto')` in node 02

The default Code node runner allows builtin module access. With
`N8N_RUNNERS_ENABLED=true` (set in `docker-compose.yml`), n8n may
sandbox the runner such that `require('crypto')` is unavailable. If
node 02 throws `require is not defined`, either:

1. Drop `N8N_RUNNERS_ENABLED` from the compose file, or
2. Replace the SHA-256 call with a pure-JS hash and accept that a
   short hash has more collisions at volume.

Preferred: option 1. The task runner is a security boundary that
matters if you ever execute untrusted code; here all code nodes are
yours, so the boundary buys little.
