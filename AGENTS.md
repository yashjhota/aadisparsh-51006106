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

- `/temples` is a pathless layout route (`temples.tsx` returns `<Outlet />`); the list page lives in `temples.index.tsx`. A leaf parent route without an Outlet silently hides child routes like `temples.$slug.tsx` — keep children rendered through the layout.
- Server logic lives in `createServerFn` modules under `src/lib/*.functions.ts`; never query Supabase directly in route loaders. Use requireSupabaseAuth for authenticated data; the Supabase publishable client for public reads.
- Test users and test registrations created for preview verification are deleted from the database after verification; never leave them behind.
