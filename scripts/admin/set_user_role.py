"""
set_user_role.py
Utility to set a role for a user via Supabase admin credentials.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python scripts/admin/set_user_role.py <user_id> <role>
"""
import os
import sys
from supabase import create_client

if len(sys.argv) < 3:
    print("Usage: python scripts/admin/set_user_role.py <user_id> <role>")
    sys.exit(1)

user_id = sys.argv[1]
role = sys.argv[2]

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
    sys.exit(2)

client = create_client(SUPABASE_URL, SUPABASE_KEY)

res = client.table("user_roles").upsert({"user_id": user_id, "role": role}).execute()
if res.error:
    print("Error:", res.error)
    sys.exit(3)

print("Set role successful")
