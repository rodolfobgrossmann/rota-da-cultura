<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Data reads use `queryOptions` in `src/lib/queries.ts` with the browser Cloud client; RLS policies are the security boundary, so every table keeps explicit policies and grants.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate that puts `user` in route context); public pages stay top-level and SSR.
- Organizer-only pages call `requireOrganizer` in their loader; the organizer role lives in `user_roles` and is granted only via the `activate_organizer()` database function.
- Dates are stored as timestamptz and always rendered/entered in America/Sao_Paulo via `src/lib/format.ts`, so server and browser output match.
- The map (Leaflet + OpenStreetMap tiles) is lazy-loaded behind `<ClientOnly>`; never import `src/components/map/*` statically from a route.
- Colors, fonts and decorative shapes (poster circle, pill tags) are tokens/utilities in `src/styles.css`; components use those, not raw colors.
