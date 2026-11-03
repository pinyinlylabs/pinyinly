import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import noop from "lodash/noop";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

export function supportsPasskeys() {
  return Platform.OS === `web` && browserSupportsWebAuthn();
}

const subscribe = () => noop;
const getServerSnapshot = () => false;

export function useSupportsPasskeys() {
  return useSyncExternalStore(subscribe, supportsPasskeys, getServerSnapshot);
}

export function passkeyErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === `NotAllowedError` || error.name === `AbortError`) {
      return `The passkey request was cancelled or timed out. Please try again.`;
    }
    if (error.name === `SecurityError`) {
      return `This browser could not use Pinyinly's passkeys. Try a current browser that supports Related Origin Requests.`;
    }
    if (error.name === `InvalidStateError`) {
      return `This passkey is already registered. Try another authenticator.`;
    }
  }
  return `Could not complete the passkey request. Please try again.`;
}
