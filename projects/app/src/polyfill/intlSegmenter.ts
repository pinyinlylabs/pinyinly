import { shouldPolyfill } from "@formatjs/intl-segmenter/should-polyfill";

export function installIntlSegmenter() {
  if (shouldPolyfill()) {
    require(`@formatjs/intl-segmenter/polyfill-force`);
  }
}
