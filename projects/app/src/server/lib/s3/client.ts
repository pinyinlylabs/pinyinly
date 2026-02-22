import {
  assetsS3AccessKeyId,
  assetsS3Endpoint,
  assetsS3SecretAccessKey,
} from "@/util/env";
import { S3Client } from "@aws-sdk/client-s3";
import { memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";

export const getAssetsS3Client = memoize0((): S3Client => {
  return new S3Client({
    region: `auto`,
    endpoint: nonNullable(assetsS3Endpoint),
    credentials: {
      accessKeyId: nonNullable(assetsS3AccessKeyId),
      secretAccessKey: nonNullable(assetsS3SecretAccessKey),
    },
  });
});
