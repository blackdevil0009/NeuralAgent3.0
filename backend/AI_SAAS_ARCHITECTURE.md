# VaidyaMedX AI SaaS Architecture

## Production Flow

Frontend -> Flask API -> JWT auth -> cache/rule router -> quota guard -> Gemini -> MySQL analytics -> frontend.

Gemini is called only when the message is not answered by the rule set or response cache. The API key stays in backend environment variables and is never returned to clients.

## Cost Controls

- Common wellness requests are answered by `app/services/cache_service.py`.
- Redis is used when `REDIS_URL` is present; otherwise an in-process TTL cache is used.
- Gemini prompts are compact and capped with `GEMINI_MAX_OUTPUT_TOKENS`.
- `user_ai_limits` tracks daily and monthly Gemini quota.
- `ai_usage_logs` and `token_tracking` estimate cost per request.
- Admin analytics exposes cache/rule reduction percentage and estimated spend.

## SaaS Plans

- Free: 5 Gemini chats/day, 150/month.
- Pro: 50/day, 1500/month.
- Premium: 150/day, 5000/month.
- Enterprise: 1000/day, 50000/month by default, configurable through B2B tables.

Cached and rule-based responses remain near-instant and reduce Gemini spend by targeting repeated wellness questions before quota-consuming API calls.

## Important Endpoints

- `POST /api/wellness/chat` - hybrid AI chat.
- `POST /api/wellness/chat/stream` - SSE-compatible response path.
- `GET /api/wellness/ai/quota` - current user quota and cache status.
- `GET /api/wellness/subscription` - current plan and quota.
- `POST /api/wellness/subscription` - create/update user plan record.
- `GET /api/wellness/admin/ai-usage` - request, token, cost, and cache analytics.
- `POST /api/v2/ai/query` - compatibility route mapped to the new hybrid system.

## MySQL Tables

New production AI/SaaS tables:

- `subscriptions`
- `user_ai_limits`
- `ai_usage_logs`
- `token_tracking`
- `cached_responses`
- `enterprise_clients`
- `invoices`

Existing wellness/B2B tables remain supported:

- `ai_conversations`
- `organizations`
- `tenant_subscriptions`
- `ai_analytics`

## Deployment Guide

1. Set `GEMINI_API_KEY` only on the backend host.
2. Use `GEMINI_MODEL=gemini-1.5-flash` or a newer low-cost Flash model after testing.
3. Run Redis in production and set `REDIS_URL`.
4. Keep `GEMINI_MAX_OUTPUT_TOKENS` between `300` and `600` for wellness chat.
5. Run behind Gunicorn/gevent with multiple workers sized to CPU and DB pool limits.
6. Monitor `GET /api/wellness/admin/ai-usage` daily for Gemini call rate, token usage, and cache savings.
7. Raise plan quotas only when plan revenue remains above estimated Gemini spend plus infrastructure margin.
