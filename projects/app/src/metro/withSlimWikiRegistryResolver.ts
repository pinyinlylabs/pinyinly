import type { MetroConfig } from "metro-config";
import type { CustomResolutionContext, Resolution } from "metro-resolver";

export function getWikiRegistrySlimModuleName(
  moduleName: string,
): string | null {
  if (!moduleName.endsWith(`/wikiRegistry`)) {
    return null;
  }

  return moduleName.replace(`/wikiRegistry`, `/wikiRegistry.slim`);
}

export function withSlimWikiRegistryResolver<T extends MetroConfig>(
  config: T,
): T {
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(
        context: CustomResolutionContext,
        moduleName: string,
        platform: string | null,
      ): Resolution {
        const parentResolver =
          config.resolver?.resolveRequest ?? context.resolveRequest;

        if (process.env.PYLY_SLIM_WIKI_FOR_TESTING === `true`) {
          const slimModuleName = getWikiRegistrySlimModuleName(moduleName);

          if (slimModuleName != null) {
            console.warn(
              `⚠️  PYLY_SLIM_WIKI_FOR_TESTING enabled, using slim wiki registry.`,
            );
            return parentResolver(context, slimModuleName, platform);
          }
        }

        return parentResolver(context, moduleName, platform);
      },
    },
  };
}
