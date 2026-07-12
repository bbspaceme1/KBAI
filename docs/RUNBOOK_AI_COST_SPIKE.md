# Runbook: AI Cost Spike

## Trigger

- Alert from scheduled job: a user's monthly token usage > 80% of monthly limit
- Sudden spike in `ai_usage_logs` cost_usd aggregated across users

## Immediate Actions

1. Identify offending user(s) via `ai_usage_logs`:

```sql
SELECT user_id, SUM(total_tokens) as tokens, SUM(cost_usd) as cost
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY cost DESC
LIMIT 20;
```

2. If user is legitimate, contact user via `notifications` and `support` channel.
3. If usage looks malicious, temporarily suspend API access:

```sql
UPDATE user_roles SET role = 'suspended' WHERE user_id = '<user_id>';
```

Or revoke active sessions via `user_sessions`.

## Preventive Steps

- Ensure `try_consume_ai_quota` RPC is active and working.
- Verify scheduled alert job (`.github/workflows/alerts.yml`) is running and environment keys are valid.
- Review provider keys in secrets and rotate if compromised.

## Post-Mortem

- Log incident in `audit_logs` with root cause, mitigation steps, and timeline.
- Consider adding billing caps or forced throttling at gateway level.
