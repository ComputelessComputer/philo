# Mobile Sync

Philo now has a third runtime target:

- `apps/mobile` is the Expo iPhone shell.
- `packages/web-editor-host` is the browser surface rendered inside the mobile WebView.
- `packages/core` holds the shared sync model and the WebView bridge contract.

The desktop app stays local-first. Sync mirrors local markdown and asset files into Supabase so the mobile app can keep a sandboxed local mirror on the device.

## Required Environment Variables

Desktop sync reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Mobile sync reads:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional mobile host override:

- `EXPO_PUBLIC_WEB_EDITOR_HOST_URL`

If `EXPO_PUBLIC_WEB_EDITOR_HOST_URL` is set, the Expo app loads the standalone Vite host from that URL. If it is not set, the app falls back to an inline editor host bundled through the native shell.

## Supabase Schema

Apply the migration in:

```text
supabase/migrations/20260401010000_sync_documents.sql
```

That migration creates:

- `public.sync_documents`
- the private `sync-blobs` storage bucket
- row-level policies for the table
- bucket policies that require object keys to be prefixed with `auth.uid()`

Blob keys now follow this shape:

```text
<user-id>/<content-hash>/<normalized-sync-path>
```

That prefix is required for storage RLS to enforce per-user access.

## Local Development

1. Apply the Supabase migration to the project you want to use for sync.
2. Export the desktop and mobile env vars listed above.
3. Start the desktop app with `pnpm dev`.
4. Start the Expo app with `pnpm dev:mobile`.
5. If you want the standalone browser host instead of the inline fallback, start `pnpm dev:web-editor-host` and point `EXPO_PUBLIC_WEB_EDITOR_HOST_URL` at a host the iPhone can reach on your LAN.

## Mobile Persistence

On mobile, sync state is split across three stores:

- `AsyncStorage` stores sync settings such as `syncEnabled`, `syncEmail`, `syncLastSyncedAt`, and `syncError`.
- `SecureStore` stores the Supabase access token and refresh token.
- Expo's document directory stores the mirrored file cache under `philo-sync/`.

The mirrored cache currently contains:

- daily-note markdown
- page markdown
- synced blobs such as images, Excalidraw files, and widget storage sidecars

The current mobile editor host is intentionally thin. It edits raw markdown through the shared bridge contract and leaves the full desktop TipTap/widget runtime extraction for follow-up work.
