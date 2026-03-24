import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { AssetImage } from "@/client/ui/AssetImage";
import { AssetStatusKind } from "@/data/model";
import type { AssetId } from "@/data/model";
import { Text, View } from "react-native";

const loadedLandscapeAssetId =
  `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw` as AssetId;
const loadedPortraitAssetId =
  `sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug` as AssetId;
const loadingAssetId = `sha256/loading-demo-asset-image-placeholder` as AssetId;
const failedAssetId = `sha256/failed-demo-asset-image-placeholder` as AssetId;
const uploadedMissingAssetId =
  `sha256/uploaded-missing-demo-asset-image-placeholder` as AssetId;

export default () => {
  return (
    <View className="gap-6">
      <View className="max-w-screen-sm gap-2">
        <Text className="pyly-body-subheading">AssetImage</Text>
        <Text className="pyly-body text-fg-dim">
          Loading examples below intentionally use an unresolved asset ID so the
          shimmer remains visible. This makes it easier to compare the
          placeholder against the loaded image in the same layout.
        </Text>
      </View>

      <LittlePrimaryHeader title="loading shimmer" />

      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="thumbnail" childrenClassName="gap-3">
          <AssetImage
            assetId={loadingAssetId}
            className="size-9 rounded-md"
            contentFit="cover"
          />
          <AssetImage
            assetId={loadingAssetId}
            className="size-14 rounded-lg"
            contentFit="cover"
          />
        </ExampleStack>

        <ExampleStack title="card" childrenClassName="gap-3">
          <AssetImage
            assetId={loadingAssetId}
            className="h-[110px] w-[180px] rounded-md"
            contentFit="cover"
          />
          <AssetImage
            assetId={loadingAssetId}
            className="h-[110px] w-[180px] rounded-md border border-fg-bg10"
            contentFit="contain"
          />
        </ExampleStack>

        <ExampleStack title="message" childrenClassName="gap-3 w-[320px]">
          <AssetImage
            assetId={loadingAssetId}
            className="aspect-[2/1] w-full rounded-lg"
            contentFit="fill"
          />
          <AssetImage
            assetId={loadingAssetId}
            className="aspect-[2/1] max-h-[220px] w-full rounded-lg"
            contentFit="contain"
          />
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="loaded image" />

      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="thumbnail" childrenClassName="gap-3">
          <AssetImage
            assetId={loadedLandscapeAssetId}
            className="size-9 rounded-md"
            contentFit="cover"
          />
          <AssetImage
            assetId={loadedPortraitAssetId}
            className="size-14 rounded-lg"
            contentFit="cover"
          />
        </ExampleStack>

        <ExampleStack title="card" childrenClassName="gap-3">
          <AssetImage
            assetId={loadedLandscapeAssetId}
            className="h-[110px] w-[180px] rounded-md"
            contentFit="cover"
          />
          <AssetImage
            assetId={loadedLandscapeAssetId}
            className="h-[110px] w-[180px] rounded-md border border-fg-bg10"
            contentFit="contain"
          />
        </ExampleStack>

        <ExampleStack title="message" childrenClassName="gap-3 w-[320px]">
          <AssetImage
            assetId={loadedLandscapeAssetId}
            className="aspect-[2/1] w-full rounded-lg"
            contentFit="fill"
          />
          <AssetImage
            assetId={loadedLandscapeAssetId}
            className="aspect-[2/1] max-h-[220px] w-full rounded-lg"
            contentFit="contain"
          />
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="error states" />

      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="failed upload" childrenClassName="gap-3">
          <AssetImage
            assetId={failedAssetId}
            className="size-14 rounded-lg"
            contentFit="cover"
            debugAssetStatus={AssetStatusKind.Failed}
            debugErrorMessage="Upload verification failed"
          />
          <AssetImage
            assetId={failedAssetId}
            className="h-[110px] w-[180px] rounded-md"
            contentFit="cover"
            debugAssetStatus={AssetStatusKind.Failed}
            debugErrorMessage="Upload verification failed"
          />
        </ExampleStack>

        <ExampleStack
          title="load error fallback"
          childrenClassName="gap-3 w-[320px]"
        >
          <AssetImage
            assetId={uploadedMissingAssetId}
            className="aspect-[2/1] w-full rounded-lg"
            contentFit="fill"
            debugAssetStatus={AssetStatusKind.Uploaded}
            debugImageError
          />
          <AssetImage
            assetId={uploadedMissingAssetId}
            className="aspect-[2/1] max-h-[220px] w-full rounded-lg"
            contentFit="contain"
            debugAssetStatus={AssetStatusKind.Uploaded}
            debugImageError
          />
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="layout note" />

      <View className="max-w-[720px] gap-2 rounded-lg border border-fg/10 bg-fg-bg5 p-3">
        <Text className="pyly-body-subheading">What this demo is testing</Text>
        <Text className="pyly-body text-fg-dim">
          AssetImage now forwards its sizing props to the loading placeholder,
          so the shimmer respects the same className-based dimensions as the
          final image. This fixes the old collapse behavior for explicitly sized
          usages like thumbnails, tooltip previews, and wide AI-generated
          images.
        </Text>
      </View>
    </View>
  );
};
