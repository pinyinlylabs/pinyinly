const prodDomain = `pinyin.ly`;
const devDomain =
  process.env.EXPO_TUNNEL_SUBDOMAIN != null &&
  process.env.NODE_ENV === `development`
    ? `${process.env.EXPO_TUNNEL_SUBDOMAIN}.ngrok.io`
    : null;

/** @type {import('expo/config.d.ts').ExpoConfig} */
export const expo = {
  name: `Pinyinly`,
  slug: `hao`,
  version: `1.9.0`,
  scheme: `pinyinly`,
  runtimeVersion: {
    policy: `fingerprint`,
  },
  newArchEnabled: true,
  orientation: `portrait`,
  icon: `./src/assets/icon.png`,
  userInterfaceStyle: `automatic`,
  splash: {
    image: `./src/assets/splash.png`,
    resizeMode: `contain`,
    backgroundColor: `#DE6447`,
  },
  assetBundlePatterns: [`**/*`],
  ios: {
    config: {
      usesNonExemptEncryption: false,
    },
    supportsTablet: true,
    bundleIdentifier: `how.haohao.hoa`,
    associatedDomains: [
      `applinks:${prodDomain}`,
      // Development
      ...(devDomain == null
        ? []
        : [
            `applinks:${devDomain}`,
            `activitycontinuation:${devDomain}`,
            `webcredentials:${devDomain}`,
          ]),
    ],
    usesAppleSignIn: true,
    // https://docs.sentry.io/platforms/react-native/data-management/apple-privacy-manifest/#create-privacy-manifest-in-expo
    privacyManifests: {
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: `NSPrivacyCollectedDataTypeCrashData`,
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            `NSPrivacyCollectedDataTypePurposeAppFunctionality`,
          ],
        },
        {
          NSPrivacyCollectedDataType: `NSPrivacyCollectedDataTypePerformanceData`,
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            `NSPrivacyCollectedDataTypePurposeAppFunctionality`,
          ],
        },
        {
          NSPrivacyCollectedDataType: `NSPrivacyCollectedDataTypeOtherDiagnosticData`,
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            `NSPrivacyCollectedDataTypePurposeAppFunctionality`,
          ],
        },
      ],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: `NSPrivacyAccessedAPICategoryUserDefaults`,
          NSPrivacyAccessedAPITypeReasons: [`CA92.1`],
        },
        {
          NSPrivacyAccessedAPIType: `NSPrivacyAccessedAPICategorySystemBootTime`,
          NSPrivacyAccessedAPITypeReasons: [`35F9.1`],
        },
        {
          NSPrivacyAccessedAPIType: `NSPrivacyAccessedAPICategoryFileTimestamp`,
          NSPrivacyAccessedAPITypeReasons: [`C617.1`],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: `./src/assets/adaptive-icon.png`,
      backgroundColor: `#DE6447`,
    },
    intentFilters: [
      {
        action: `VIEW`,
        autoVerify: true,
        data: [
          {
            scheme: `https`,
            host: `*.${prodDomain}`,
            pathPrefix: `/learn`,
          },
        ],
        category: [`BROWSABLE`, `DEFAULT`],
      },
    ],
    package: `how.haohao.hoa`,
  },
  web: {
    bundler: `metro`,
    output: `server`,
    favicon: `./src/assets/favicon.png`,
  },
  extra: {
    eas: {
      projectId: `67cd571e-6234-4837-8e61-d9b4d19f0acf`,
    },
  },
  owner: `pinyinly`,
  updates: {
    url: `https://u.expo.dev/67cd571e-6234-4837-8e61-d9b4d19f0acf`,
    assetPatternsToBeBundled: [`./src/**/*.asset.json`],
  },
  plugins: [
    [
      `@sentry/react-native/expo`,
      {
        organization: `pinyinly`,
        project: `app`,
        url: `https://sentry.io/`,
      },
    ],
    [`expo-audio`],
    [`expo-apple-authentication`],
    [`expo-asset`],
    [`expo-dev-client`, { launchMode: `most-recent` }],
    [`expo-font`],
    [`expo-localization`],
    [`expo-router`, { origin: `https://${devDomain ?? prodDomain}` }],
    [`expo-secure-store`],
    [`expo-sqlite`],
  ],
  experiments: {
    reactCompiler: true,
    typedRoutes: true,
  },
};
