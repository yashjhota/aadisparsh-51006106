<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project decisions

- Initial superadmin bootstrap: a one-time setup code (bcrypt-hashed in `public.app_setup`) is claimed at `/setup` by a signed-in user; the security-definer `claim_superadmin` grants `platform_superadmin` only while no superadmin exists and clears the hash on success. Setup closes permanently after one use; a new code requires resetting `app_setup` via SQL. Temple staff grants happen in the `/admin` console, verified server-side with `is_superadmin`.
- `/temples` is a pathless layout route (`temples.tsx` returns `<Outlet />`); the list page lives in `temples.index.tsx`. A leaf parent route without an Outlet silently hides child routes like `temples.$slug.tsx` — keep children rendered through the layout.
- Server logic lives in `createServerFn` modules under `src/lib/*.functions.ts`; never query Supabase directly in route loaders. Use requireSupabaseAuth for authenticated data; the Supabase publishable client for public reads.
- Test users and test registrations created for preview verification are deleted from the database after verification; never leave them behind.
- OneDigital imports: imported devotees get pre-confirmed mobile accounts with random passwords, tracked in server-only `legacy_import_accounts`; `signUpWithMobile` lets the matching mobile set a password once (claimed_at). Why: devotees keep their history without staff resetting passwords.
- Staff CRM reads (devotee directory/profile) use the admin client only after has_temple_role/is_superadmin checks, scoped to the temple's organization. Why: imported devotees without bookings are invisible to staff under RLS. PostgREST caps at 1000 rows, so page with range().
- Each onboarded temple trust gets its own organization + city rows (onboardTemple in temple-admin.functions.ts); the trustee login is created before any rows so failures leave nothing half-made. Why: org-level isolation keeps trusts separate in one database.
