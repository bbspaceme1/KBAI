# KBAI Terminal — Instruksi untuk Copilot

Stack: React 19, TanStack Start, TypeScript, Supabase Postgres, Vercel, Tailwind v4, Midtrans.

ATURAN WAJIB:

- Semua fungsi admin HARUS panggil `requireAdminAccess()` dari `src/lib/rbac.ts` — jangan buat pengecekan role ad-hoc baru.
- Semua rate-limiting HARUS pakai `src/lib/rate-limiter.ts` — jangan buat implementasi in-memory baru.
- Semua pemanggilan AI provider HARUS lewat `src/lib/ai-gateway.ts` (`callAI`) — jangan panggil OpenAI/Anthropic/Gemini API langsung dari file lain.
- Validasi input finansial (lot, price, ticker) HARUS pakai schema di `src/lib/validation.ts`.
- Setelah mengubah signature/parameter sebuah fungsi exported, WAJIB grep semua caller-nya dan update semuanya di PR yang sama — jangan tinggalkan caller lama.
- Operasi yang mengubah `cash_balances` atau `holdings` HARUS lewat RPC Postgres dengan row lock (`FOR UPDATE`), validasi di dalam RPC, bukan di app-layer terpisah.

## Database change policy

- Read-only inspection MUST use SQL/`execute_sql`; never use `apply_migration` for inspection or verification.
- Every schema, RLS, function, trigger, grant, or ACL change MUST first land in Git as `supabase/migrations/<version>_<snake_name>.sql`, pass replay on an empty local database, then be applied to staging, then to production only with explicit human approval.
- Emergency production-first changes require a same-day follow-up PR containing the same version and verbatim statements, with the incident and approval recorded.
- Migration names must be descriptive; UUID-only names and duplicate names are forbidden.
- Never run remote `db push`, migration repair, reset, or ledger edits from an agent session without explicit release-owner approval after reconciliation and backup evidence.
