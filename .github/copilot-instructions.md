# KBAI Terminal — Instruksi untuk Copilot

Stack: React 19, TanStack Start, TypeScript, Supabase Postgres, Vercel, Tailwind v4, Midtrans.

ATURAN WAJIB:

- Semua fungsi admin HARUS panggil `requireAdminAccess()` dari `src/lib/rbac.ts` — jangan buat pengecekan role ad-hoc baru.
- Semua rate-limiting HARUS pakai `src/lib/rate-limiter.ts` — jangan buat implementasi in-memory baru.
- Semua pemanggilan AI provider HARUS lewat `src/lib/ai-gateway.ts` (`callAI`) — jangan panggil OpenAI/Anthropic/Gemini API langsung dari file lain.
- Validasi input finansial (lot, price, ticker) HARUS pakai schema di `src/lib/validation.ts`.
- Setelah mengubah signature/parameter sebuah fungsi exported, WAJIB grep semua caller-nya dan update semuanya di PR yang sama — jangan tinggalkan caller lama.
- Operasi yang mengubah `cash_balances` atau `holdings` HARUS lewat RPC Postgres dengan row lock (`FOR UPDATE`), validasi di dalam RPC, bukan di app-layer terpisah.


## Database change policy (mandatory)

- Read-only inspection MUST use SQL/execute_sql, never apply_migration.
- Every schema/RLS/function-ACL change MUST first land in git as supabase/migrations/<version>_<snake_name>.sql, pass replay on an empty local DB, then be applied to staging, then to production with human approval.
- Emergency production-first changes are allowed only with a same-day follow-up PR that adds the file with the SAME version and verbatim statements.
- Migration names must be descriptive; UUID names and duplicate names are forbidden.

Do not use migration tools for read-only inspection. Never write to a remote database or migration ledger without explicit human approval for the specific operation. Report replay/staging/production status honestly and include evidence; do not infer success from a command being submitted.
