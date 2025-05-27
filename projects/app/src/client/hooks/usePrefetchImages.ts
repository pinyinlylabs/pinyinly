import { useQueries } from "@tanstack/react-query";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { Platform } from "react-native";

export function usePrefetchImages(...images: (string | number)[]) {
  return useQueries({
    queries: images.map((image) => ({
      queryKey: [usePrefetchImages.name, image],
      queryFn: () => cacheImage(image),
    })),
  });
}

function cacheImage(image: string | number) {
  if (Platform.OS === `web`) {
    const uri = typeof image === `string` ? image : Asset.fromModule(image).uri;
    return Image.prefetch(uri);
  }
  return Asset.fromModule(image).downloadAsync();
}
