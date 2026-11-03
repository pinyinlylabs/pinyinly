---
description:
  "Use when changing or debugging app account signup, login, passkeys, authentication sessions, or
  learning-data sync."
---

# Authentication and accounts

This document describes the current authentication and account-data behavior. In particular, a local
device session is not the same thing as an authenticated server session.

## Session and data model

- The client keeps a list of device sessions in its device store. The first entry is active; each
  entry has a `replicacheDbName` and may have a `serverSessionId`, `userId`, and auth method. See
  [`auth.ts`](../../../projects/app/src/client/auth.ts).
- `replicacheDbName` identifies a local Replicache database. It is not a server session ID.
- `serverSessionId` identifies an authenticated Lucia session. The client sends it in the
  application session header; the server resolves it and rejects expired or unknown sessions.
  Authenticated procedures require a valid session. See
  [`TrpcProvider.tsx`](../../../projects/app/src/client/ui/TrpcProvider.tsx),
  [`trpcContext.ts`](../../../projects/app/src/server/lib/trpcContext.ts), and
  [`trpc.ts`](../../../projects/app/src/server/lib/trpc.ts).
- Lucia sessions expire after 365 days. Logging out switches the active device session locally; it
  does not revoke the server session. See [`auth.ts`](../../../projects/app/src/server/lib/auth.ts).

## First use and anonymous progress

On first use, the client creates a device session with a local database name and no server session
ID. The user's progress is kept in that local Replicache database. On web, Replicache uses
IndexedDB; it uses an in-memory store only when IndexedDB is unavailable, such as during static
rendering. See
[`replicacheOptions.web.ts`](../../../projects/app/src/client/ui/replicacheOptions.web.ts).

Without a `serverSessionId`, Replicache has no push or pull handlers, so anonymous progress is not
synced to the server. With authentication, the client enables push and pull, and the server applies
them to the authenticated user's data. See
[`RizzleProvider.tsx`](../../../projects/app/src/client/ui/RizzleProvider.tsx) and
[`replicache.ts`](../../../projects/app/src/server/routers/replicache.ts).

## Signup, login, and local data

The web login page offers Apple sign-in and passkey signup/login. Passkeys are not implemented in
the native app. See [`login.tsx`](../../../projects/app/src/app/login.tsx).

- **Passkey signup** optionally saves a display name, creates a new user and server session, then
  adds a passkey.
- **Apple sign-in** finds or creates a user from the Apple provider subject, then creates a server
  session. The same flow serves both first-time signup and later sign-in.
- **Passkey login** verifies the passkey and creates a new server session for the existing user.
- After successful authentication, the client activates a device session and enables server sync. On
  passkey login it reuses a local device database already associated with that user, if one is
  present; otherwise it creates a new local database and pulls that account's server data.

**A new account does not adopt or merge the current anonymous database.** A new passkey user has no
matching local user session, so signup creates a separate Replicache database. Apple sign-in also
creates a separate local database when there is no matching local server session. The anonymous
database is left as a separate device session; its progress is not copied to the account. Sync
starts for the authenticated database, but that does not upload the anonymous database's existing
history. Do not promise anonymous-data migration unless an explicit migration is implemented.

The auth code has a stale comment suggesting anonymous sessions can be “adopted”; the behavior above
describes the current implementation.

## Passkey management and deployment

Production uses RP ID `pinyinly.com`; `https://pinyin.ly` and `https://www.pinyin.ly` are related
origins. Use a current browser supporting WebAuthn Related Origin Requests. Credentials created
under the old `pinyin.ly` RP ID cannot be used with the new RP ID. Native passkeys are not
implemented.

Local development uses RP ID `localhost` and a separate database. Set
`PYLY_WEBAUTHN_RP_ID=localhost` and `PYLY_WEBAUTHN_ORIGINS=http://localhost:8081` in the app's local
environment. For other local ports, supply comma-separated localhost origins. Use `localhost`, not
`127.0.0.1`. Production defaults require no overrides; never deploy local overrides to production.
See [`passkey.ts`](../../../projects/app/src/server/lib/passkey.ts).

In Settings > Accounts, a signed-in user can add, rename, and remove named passkeys. The last
passkey cannot be removed, even if Apple is linked. Removing a passkey prevents future logins with
that credential but does not revoke sessions that are already signed in. Passkey credentials are
server-side and scoped to their RP ID; they do not sync between local and production. Learning data
continues to sync according to the existing account sync rules.

If passkey registration is cancelled or fails during signup, the account remains signed in and the
user can retry in Settings > Accounts.

For rollout:

1. Apply generated database migrations.
2. Deploy the app's `/.well-known/webauthn` endpoint and host-aware redirects **before** clearing
   the domain-level `pinyinly.com` redirect in the Vercel app project. Keep other domain redirects
   unchanged.
3. Verify `curl -i https://pinyinly.com/.well-known/webauthn` returns status 200, JSON content type,
   and `{"origins":["https://pinyin.ly","https://www.pinyin.ly"]}` without a redirect. Other paths
   on `pinyinly.com` must still redirect to `https://pinyin.ly` with paths and queries intact.
4. Test signup and login in a ROR-capable browser, adding a second passkey to an existing account,
   and a separate localhost credential on an already-synced local account.

For local account testing on a phone, the development session-ID login can activate an existing
server session when an OAuth redirect URL does not match. Keep this development-only workflow out of
production usage.

## Apple sign-in security limitation

The Apple login endpoint currently parses the identity token and reads its subject but does not
verify the token signature, issuer, audience, or expiry. This is an account-impersonation risk;
passkey support does not address it. See the TODO in
[`auth.ts`](../../../projects/app/src/server/routers/auth.ts).
