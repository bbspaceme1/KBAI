"""
check_ai_costs.py
Daily alerting job: checks AI usage and creates notifications for users approaching limits.
"""
import os
from datetime import datetime, timedelta
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

client = create_client(SUPABASE_URL, SUPABASE_KEY)


def run():
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Fetch subscriptions
    subs = client.table("subscriptions").select("user_id,daily_limit,monthly_limit,tier").execute().data or []

    for s in subs:
        user_id = s.get("user_id")
        monthly_limit = int(s.get("monthly_limit") or 0)

            # Sum usage this month for successful AI calls only
        rows = client.table("ai_usage_logs").select("user_id,total_tokens,cost_usd,created_at").eq("user_id", user_id).eq("status", "success").gte("created_at", month_start.isoformat()).execute().data or []

        total_tokens = sum([r.get("total_tokens") or 0 for r in rows])

        # Notify if >80% of monthly limit
        threshold = 0.8
        if monthly_limit > 0 and total_tokens >= monthly_limit * threshold:
            # Create notification
            message = f"Penggunaan AI Anda bulan ini telah mencapai {int(total_tokens)} token ({int(total_tokens/monthly_limit*100)}% dari kuota)."
            client.table("notifications").insert({
                "user_id": user_id,
                "title": "Peringatan penggunaan AI",
                "body": message,
                "created_at": now.isoformat(),
            }).execute()

    print("Alerting run complete")


if __name__ == "__main__":
    run()
