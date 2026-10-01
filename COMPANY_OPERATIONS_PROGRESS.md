# KBAI Company Operations — Implementation Progress

Tanggal: 1 Oktober 2026
Status: Code foundation selesai; migration dan perubahan production database sengaja ditinggalkan.

## Sudah dikerjakan

- Menambahkan model otorisasi murni di `src/lib/company-operations.ts`.
- Mendefinisikan 10 account type dari PRD tanpa membuat tabel baru di client.
- Mendefinisikan mapping 22 sub-role organisasi ke account type.
- Menambahkan katalog permission dengan resource/action, risk level, dan approval requirement.
- Menambahkan evaluasi akses berdasarkan authentication, permission, ownership scope, domain, approval, dan state.
- Menambahkan guard creator tidak boleh menjadi approver.
- Menambahkan proteksi eksplisit bahwa `audit.delete` selalu ditolak.
- Menambahkan state transition guard: `draft → review → approved → published`.
- Menambahkan unit test untuk authorization, approval separation, audit delete prohibition, permission metadata, dan state transition.
- Tidak mengubah data production, tidak menjalankan migration, dan tidak membuat tabel duplikat.

## Belum dikerjakan — migration/database gate

1. Verifikasi schema production aktual untuk `app_role`, `user_roles`, `features`, `plans`, `plan_entitlements`, `company_subscriptions`, `advisor_clients`, dan `methodologies`.
2. Migration additive untuk enum role yang telah disetujui.
3. Tabel `permissions`, `user_sub_roles`, `role_permissions`, `approval_policies`, dan `approval_requests`.
4. Kolom ownership/audit/state pada tabel domain yang benar-benar membutuhkannya.
5. RLS default-deny, grants, revoke anon, indexes, dan policy negative tests.
6. Trigger immutability/creator-not-approver dan atomic approval transitions.
7. Seed permission dan role mapping setelah approval pemilik produk.
8. Integrasi audit log untuk assignment, approval, publish, dan staff access.
9. Integrasi export, anonymization, dan permanent deletion.
10. Verifikasi staging, Supabase advisors, migration list, lalu apply production secara manual.

## Belum dikerjakan — application workflow

1. Server functions untuk assignment, permission evaluation, approval request, approval decision, dan state transition.
2. Session-derived actor identity pada seluruh operasi; payload client tidak dipercaya.
3. Granular app-shell navigation untuk enam account type internal baru.
4. Admin/Control UI untuk role assignment dan permission review.
5. Operations, Finance, Product/Growth, Community, Market Intelligence, dan Tech/AI pages.
6. Approval inbox dan separation-of-duties UI.
7. Audit viewer terfilter per domain dan scope.
8. Entitlement sync untuk customer plans.
9. End-to-end tests untuk role/scope/approval matrix.

## Validation

Commands yang wajib dijalankan setelah migration dan server workflow selesai:

```bash
npm run type-check
npm run lint:ci
npm run test:run
npm run test:rls
npm run test:e2e
npm run build
supabase migration list --linked
supabase db advisors --linked
```

Code foundation ini tidak dianggap production-ready sampai daftar migration/database dan workflow di atas selesai serta diverifikasi di staging.
