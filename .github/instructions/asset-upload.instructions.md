---
applyTo: "projects/app/**"
---

# Asset Upload Implementation (Current)

This document reflects the current asset upload implementation in `projects/app`.

## High-level flow

1. Client computes `assetId` from file bytes (`sha256/<base64url>`).
2. Client writes optimistic pending state via Replicache mutator `initAsset`.
3. Client requests a presigned upload URL via `trpc.asset.requestUploadUrl`.
4. Client uploads directly to object storage with HTTP `PUT`.
5. Client marks upload complete via Replicache mutator `confirmAssetUpload`.
6. Client verifies object existence via `trpc.asset.confirmUpload`.
7. If verification fails, client marks failure via `failAssetUpload`.

## Storage and IDs

- Object key format: `blob/{assetId}`.
- `assetId` format: `sha256/<base64url-hash>`.
- Key generation helper: `getBucketObjectKeyForId` in `src/util/assetId.ts`.
- Assets are tracked per user in DB/Replicache (`asset.userId`).
- Object key itself does not include `userId`; authorization is enforced at API/mutator level.

## Limits and validation

- Max size: `5 * 1024 * 1024` bytes (5MB).
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
- Presigned URL TTL: 15 minutes.

## Core files

- Client upload hook: `src/client/ui/hooks/useImageUploader.ts`.
- Asset rendering: `src/client/ui/AssetImage.tsx`.
- tRPC router: `src/server/routers/asset.ts`.
- S3/R2 helpers: `src/server/lib/s3/assets.ts` and `src/server/lib/s3/client.ts`.
- Replicache schema entity/mutators: `src/data/rizzleSchema.ts` (`v11+`, current `v13`).
- Replicache server impl (current): `src/server/lib/replicache/v12.ts` (wired for schema `v13`).
- DB table: `src/server/pgSchema.ts` (`asset` table).
- Migration introducing `asset`: `drizzle/0027_sloppy_secret_warriors.sql`.

## tRPC endpoints

- `asset.requestUploadUrl`: returns `{ uploadUrl, assetKey }`.
- `asset.confirmUpload`: verifies storage object, returns
  `{ success, contentType?, contentLength? }`.
- `asset.getDownloadUrl`: presigned read URL for existing object.
- `asset.getUploadUrl`: presigned upload URL for remote sync.
- `asset.listAssetBucketUserFiles`: returns user-referenced asset IDs.

## Replicache entity and mutators

- Entity key: `a/[assetId]`.
- Fields: `assetId`, `status`, `contentType`, `contentLength`, `createdAt`, `uploadedAt`,
  `errorMessage`.
- Mutators:
  - `initAsset`
  - `confirmAssetUpload`
  - `failAssetUpload`

## Environment variables

Defined in `projects/app/.env.local.sample`:

- `PYLY_ASSETS_S3_ENDPOINT`
- `PYLY_ASSETS_S3_ACCESS_KEY_ID`
- `PYLY_ASSETS_S3_SECRET_ACCESS_KEY`
- `PYLY_ASSETS_S3_BUCKET`
- `EXPO_PUBLIC_ASSETS_CDN_BASE_URL`

For local defaults, the sample uses:

- endpoint: `http://127.0.0.1:9000`
- credentials: `miniodev` / `miniodev`
- bucket: `pinyinly-assets`
- CDN base URL: `http://127.0.0.1:9000/pinyinly-assets/`

## Local development (Minio)

Use the setup from `CONTRIBUTING.md`:

1. Install:
   - `brew install minio/aistor/minio`
   - `brew install minio/aistor/mc`
2. Configure bucket and access via `mc`:
   - `mc alias set local http://127.0.0.1:9000 miniodev miniodev`
   - `mc mb --ignore-existing local/pinyinly-assets`
   - `mc anonymous set download local/pinyinly-assets`
   - Apply CORS config from `CONTRIBUTING.md` when testing web uploads.
3. Start app and services:
   - `moon run app:dev` (Expo + Inngest + Minio)
   - or `moon run app:devServices` for services only.

Current `devMinio` task command is defined in `projects/app/moon.yml` and binds console to `:9001`.
