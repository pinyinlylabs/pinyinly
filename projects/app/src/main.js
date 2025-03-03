import { installCryptoPolyfill } from "@/polyfill/crypto";
import { installSymbolAsyncInteratorPolyfill } from "@/polyfill/symbolAsyncIterator";

installCryptoPolyfill();
installSymbolAsyncInteratorPolyfill();

// Works around an issue where metro couldn't resolve
// `node_modules/expo-router/entry`.
//
// @ts-expect-error no TypeScript module definition for expo-router/entry
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
module.exports = require(`expo-router/entry`);
