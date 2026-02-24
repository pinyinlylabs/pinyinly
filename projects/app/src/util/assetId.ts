import type { AssetId } from "@/data/model";
import * as Crypto from "expo-crypto";

export const assetKeyPrefix = `blob/`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ``;
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  if (typeof btoa === `function`) {
    return btoa(binary);
  }

  return Buffer.from(binary, `binary`).toString(`base64`);
}

function toBase64Url(base64: string): string {
  return base64
    .replaceAll(`+`, `-`)
    .replaceAll(`/`, `_`)
    .replaceAll(/=+$/gu, ``);
}

export async function getArrayBufferAssetId(
  buffer: ArrayBuffer,
): Promise<AssetId> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    buffer,
  );
  const base64 = bytesToBase64(new Uint8Array(digest));
  const hash = toBase64Url(base64);
  return `sha256/${hash}` as AssetId;
}

/**
 * Convert an asset ID to its storage key.
 * Generates a key in the format: blob/<assetId>
 *
 * @param assetId - The asset ID
 * @returns The storage key for the asset
 */
export function getBucketObjectKeyForId(assetId: AssetId): string {
  return `${assetKeyPrefix}${assetId}`;
}
