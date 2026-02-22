# Asset Upload Implementation Summary

This implementation adds support for user-uploaded images (assets) for use in mnemonics, with an
offline-first architecture using optimistic updates.

## Architecture Overview

### Key Components

1. **S3 Storage**: User-uploaded files are stored in S3 buckets
2. **Replicache Integration**: Asset status is synced across devices
3. **Optimistic Uploads**: UI can show assets immediately before upload completes
4. **Asset Immutability**: Once uploaded, assets cannot be modified (only created)

### Asset Lifecycle

```
Client generates assetId (nanoid)
  ↓
Call initAsset mutator (optimistic) → Creates pending asset in Replicache
  ↓
Request presigned upload URL from server → Returns S3 presigned URL
  ↓
Upload file directly to S3 using presigned URL
  ↓
Call confirmAssetUpload mutator → Marks asset as uploaded in Replicache
```

## Implementation Details

### 1. Database Schema (`pgSchema.ts`)

Added `asset` table with:

- `assetId`: Client-generated ID (nanoid)
- `status`: pending | uploaded | failed
- `contentType`: MIME type
- `contentLength`: File size in bytes
- `createdAt`, `uploadedAt`: Timestamps
- `errorMessage`: For failed uploads

Migration: `drizzle/0027_blue_agent_brand.sql`

### 2. Replicache Schema (`rizzleSchema.ts`)

Added to v9 schema:

- `AssetStatusKind` enum (Pending, Uploaded, Failed)
- `asset` entity with key `a/[assetId]`
- Mutators:
  - `initAsset`: Create pending asset record
  - `confirmAssetUpload`: Mark asset as uploaded
  - `failAssetUpload`: Mark asset as failed

### 3. Server Infrastructure

#### S3 Client (`server/lib/s3/`)

- `client.ts`: S3 client initialization, config management
- `assets.ts`: Presigned URL generation, asset verification
  - `createPresignedUploadUrl()`: Generate upload URL
  - `verifyAssetExists()`: Check if asset exists in S3
  - `MAX_ASSET_SIZE_BYTES`: 5MB limit
  - `ALLOWED_IMAGE_TYPES`: jpeg, png, webp, gif

#### tRPC Router (`server/routers/asset.ts`)

- `requestUploadUrl`: Get presigned URL for upload
- `confirmUpload`: Verify asset uploaded successfully

### 4. Replicache Integration (`server/lib/replicache/v9.ts`)

Added asset sync entity:

- Tracks asset status changes via CVR
- Syncs asset records across all user devices
- Added mutator implementations for DB operations

### 5. Configuration

Environment variables (`.env.local.sample`):

```
PYLY_ASSETS_S3_ENDPOINT=https://<accountId>.r2.cloudflarestorage.com
PYLY_ASSETS_S3_ACCESS_KEY_ID=...
PYLY_ASSETS_S3_SECRET_ACCESS_KEY=...
PYLY_ASSETS_S3_BUCKET=pinyinly-assets
EXPO_PUBLIC_ASSETS_CDN_BASE_URL=https://assets.example.com
```

## Asset Key Format

Assets are stored in S3 with key: `u/{userId}/{assetId}`

- `u/` prefix: Identifies user-uploaded assets
- `{userId}`: Scopes assets to user
- `{assetId}`: Unique identifier (nanoid)

## Usage Flow

### Client-side Upload Flow

```typescript
import { nanoid } from "nanoid";
import { trpc } from "@/client/query";
import { useRizzle } from "@/client/ui/hooks/useRizzle";

async function uploadImage(file: File) {
  const r = useRizzle();
  const assetId = nanoid();

  // 1. Optimistically create pending asset
  await r.mutate.initAsset({
    assetId,
    contentType: file.type,
    contentLength: file.size,
    now: new Date(),
  });

  // 2. Get presigned upload URL
  const { uploadUrl } = await trpc.asset.requestUploadUrl.mutate({
    assetId,
    contentType: file.type as AllowedImageType,
    contentLength: file.size,
  });

  // 3. Upload file directly to S3
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  // 4. Confirm upload
  await r.mutate.confirmAssetUpload({
    assetId,
    now: new Date(),
  });

  // 5. Verify server-side
  const { success } = await trpc.asset.confirmUpload.mutate({ assetId });

  if (!success) {
    await r.mutate.failAssetUpload({
      assetId,
      errorMessage: "Upload verification failed",
      now: new Date(),
    });
  }

  return assetId;
}
```

### Querying Assets

```typescript
const r = useRizzle();

// Get a specific asset
const asset = await r.query((tx) => tx.asset.get({ assetId: "abc123" }));

// Get all assets
const assets = await r.query((tx) => tx.asset.scan({}).toArray());

// Get pending uploads
const pending = assets.filter(([, a]) => a.status === AssetStatusKind.Pending);
```

## Constraints & Limits

- **Max file size**: 5MB
- **Allowed types**: JPEG, PNG, WebP, GIF
- **Presigned URL TTL**: 15 minutes
- **Asset immutability**: Assets cannot be modified after upload

## Future Enhancements

Potential improvements not included in this implementation:

1. **Image Transformation**: Server-side resizing/optimization
2. **Garbage Collection**: Delete unused assets from S3
3. **Progress Tracking**: Upload progress callbacks
4. **Retry Logic**: Automatic retry for failed uploads
5. **Hints**: System vs. user-provided hints structure
6. **Asset References**: Track which mnemonics use which assets

## Local Development with Minio

For local development, use Minio as a drop-in S3-compatible replacement for S3.

### Setup

1. **Install Minio** (one-time):

   ```bash
   brew install minio/stable/minio
   ```

2. **Create bucket in Minio console**:
   - Run `moon run app:devMinio` (or `moon run app:dev` to start all services)
   - Open `http://localhost:9001`
   - Login with default credentials: `minioadmin` / `minioadmin`
   - Create bucket named `pinyinly-assets`
   - Make bucket public (allow read-only access)

3. **Configure `.env.local`**:

   ```
   PYLY_ASSETS_S3_ENDPOINT=http://localhost:9000
   PYLY_ASSETS_S3_ACCESS_KEY_ID=minioadmin
   PYLY_ASSETS_S3_SECRET_ACCESS_KEY=minioadmin
   PYLY_ASSETS_S3_BUCKET=pinyinly-assets
   EXPO_PUBLIC_ASSETS_CDN_BASE_URL=http://localhost:9000
   ```

4. **Run development server**:
   ```bash
   moon run app:dev
   ```

The `app:dev` task now automatically starts Expo, Inngest, and Minio together. Each service will
automatically restart up to 100 times on crash, so the development environment stays resilient
during memory leaks or other transient failures.

Minio data persists in `./minio-data` across restarts.

- Server runs at `http://localhost:9000`
- Console at `http://localhost:9001`

The API will automatically use the endpoint from `PYLY_ASSETS_S3_ENDPOINT` whether it's Minio
locally or S3 in production.

## Testing

To test the implementation:

1. Set up Minio and configure `.env.local` (see Local Development section above)
2. Run migration: `moon run app:db:migrate`
3. Start server: `moon run app:dev`
4. Use tRPC routes or implement client upload UI

## Security Considerations

- Presigned URLs expire after 15 minutes
- Assets are scoped to userId in S3 key structure
- Content-Type and Content-Length are validated server-side
- File size limits prevent abuse
- Only authenticated users can upload
