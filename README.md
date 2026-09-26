# professor-Marooy-student-support-agent-n8n

A self-hosted n8n workflow that answers university student-support
questions. Inbound webhook → MySQL ticket → LLM classification →
MySQL full-text knowledge-base search → LLM answer generation →
MySQL update → JSON response.

Stack: n8n (self-hosted), MySQL 8.x, OpenRouter for both LLM calls.

## How it works

1. Student submits a question to the webhook (node 01).
2. The payload is normalized and given an idempotency key (02).
3. A ticket row is inserted; its `insertId` is the ticket ID (03).
4. The question is classified into a category and priority (04).
5. A Code node independently validates that classification, because
   the provider's `json_schema` flag is a request, not a guarantee (05).
6. MySQL full-text search retrieves the top 5 knowledge-base hits (06).
7. Hits are concatenated into a bounded context block (07).
8. The LLM answers using only those excerpts and cites them (08).
9. The answer is extracted (09) and written back to the ticket (10).
10. A compact JSON reply is returned to the caller (11, 12).

Failures at 04, 06, and 08 fall back to defaults so the ticket always
reaches a terminal state rather than sitting in `new` forever.

## Requirements

- Docker and Docker Compose
- An OpenRouter API key with access to `openai/gpt-4o-mini` (or any
  model that honors `json_schema` strictly)
- ~2 GB RAM for the pair of containers

## Quickstart

```bash
cp .env.example .env
# Fill in N8N_ENCRYPTION_KEY, MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD.
#   openssl rand -base64 48   # encryption key
#   openssl rand -base64 32   # root password

docker compose up -d
docker compose logs -f mysql   # wait for healthcheck to pass
docker compose logs -f n8n
