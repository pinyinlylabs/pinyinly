import { queryOptions, useQueries } from "@tanstack/react-query";
import { Asset } from "expo-asset";
import { Image } from "@/client/ui/Image";
import { Platform } from "react-native";

export function usePrefetchImages(...images: RnRequireSource[]): void {
  useQueries({
    queries: images.map((image) => getPrefetchImageOptions(image)),
  });
}

export function getPrefetchImageOptions(image: RnRequireSource) {
  return queryOptions({
    queryKey: [usePrefetchImages.name, image],
    queryFn: async () => cacheImage(image),
  });
}

async function cacheImage(image: RnRequireSource) {
  if (Platform.OS === `web`) {
    const uri = typeof image === `string` ? image : Asset.fromModule(image).uri;
    return Image.prefetch(uri);
  }
  return Asset.fromModule(image).downloadAsync();
}
