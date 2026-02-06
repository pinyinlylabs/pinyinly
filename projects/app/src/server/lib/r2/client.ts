import { S3Client } from "@aws-sdk/client-s3";
import { memoize0 } from "@pinyinly/lib/collections";

function getR2Config() {
  const endpoint = process.env[`PYLY_ASSETS_R2_ENDPOINT`] ?? ``;
  const accessKeyId = process.env[`PYLY_ASSETS_R2_ACCESS_KEY_ID`] ?? ``;
  const secretAccessKey = process.env[`PYLY_ASSETS_R2_SECRET_ACCESS_KEY`] ?? ``;
  const bucket = process.env[`PYLY_ASSETS_R2_BUCKET`] ?? ``;

  if (
    endpoint.length === 0 ||
    accessKeyId.length === 0 ||
    secretAccessKey.length === 0 ||
    bucket.length === 0
  ) {
    throw new Error(
      `Missing R2 configuration. Set PYLY_ASSETS_R2_ENDPOINT, PYLY_ASSETS_R2_ACCESS_KEY_ID, PYLY_ASSETS_R2_SECRET_ACCESS_KEY, and PYLY_ASSETS_R2_BUCKET.`,
    );
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

export const getR2Client = memoize0((): S3Client => {
  const config = getR2Config();

  return new S3Client({
    region: `auto`,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
});

export function getR2Bucket(): string {
  return getR2Config().bucket;
}

/**
 * The public CDN URL for serving assets. User should configure this based on
 * their Cloudflare R2 public bucket or custom domain setup.
 */
export function getAssetCdnBaseUrl(): string {
  return process.env[`EXPO_PUBLIC_ASSETS_CDN_BASE_URL`] ?? ``;
}
