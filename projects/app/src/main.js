import { installCryptoPolyfill } from "./polyfill/crypto";
import { installIntlSegmenter } from "./polyfill/intlSegmenter";
import { installSymbolAsyncInteratorPolyfill } from "./polyfill/symbolAsyncIterator";

installCryptoPolyfill();
installIntlSegmenter();
installSymbolAsyncInteratorPolyfill();

// Works around an issue where metro couldn't resolve
// `node_modules/expo-router/entry`.
//
// @ts-expect-error no TypeScript module definition for expo-router/entry
// oxlint-disable-next-line typescript/no-unsafe-assignment
module.exports = require(`expo-router/entry`);
