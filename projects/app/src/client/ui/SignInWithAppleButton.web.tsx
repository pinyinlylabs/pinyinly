/// <reference types="apple-signin-api" />

import { documentEventListenerEffect } from "@/util/hooks";
import { invariant } from "@haohaohow/lib/invariant";
import { useEffect, useMemo, useState } from "react";
import { SignInWithAppleButtonProps } from "./SignInWithAppleButton";
import { useEventCallback } from "./util";

type AppleIdSignInOnSuccessEvent = CustomEvent<AppleSignInAPI.SignInResponseI>;
type AppleIdSignInOnFailureEvent = CustomEvent<AppleSignInAPI.SignInErrorI>;

declare global {
  interface DocumentEventMap {
    AppleIDSignInOnSuccess: AppleIdSignInOnSuccessEvent;
    AppleIDSignInOnFailure: AppleIdSignInOnFailureEvent;
  }
}

/**
 * Ensures on web that the top status bar background color matches the view background.
 */
export function SignInWithAppleButton({
  mode,
  color,
  clientId,
  type,
  border,
  logoSize,
  borderRadius,
  scope: scopeArray,
  redirectUri,
  state,
  nonce,
  width,
  height,
  usePopup = true,
  labelPosition,
  locale = `en_US`,
  onSuccess: onSuccessProp,
}: SignInWithAppleButtonProps) {
  const [appleApi, setAppleApi] = useState<AppleSignInAPI.AppleID>();

  const scope = scopeArray?.join(` `);

  const buttonProps = useMemo(() => {
    const props: Record<`data-${string}`, string | number> = {};

    if (mode !== undefined) {
      props[`data-mode`] = mode;
    }

    if (color !== undefined) {
      props[`data-color`] = color;
    }

    if (type !== undefined) {
      props[`data-type`] = type;
    }

    if (width !== undefined) {
      props[`data-width`] = width;
    }

    if (height !== undefined) {
      props[`data-height`] = height;
    }

    if (borderRadius !== undefined) {
      props[`data-border-radius`] = borderRadius;
    }

    if (border !== undefined) {
      props[`data-border`] = border ? `true` : `false`;
    }

    if (logoSize !== undefined) {
      props[`data-logo-size`] = logoSize;
    }

    if (labelPosition !== undefined) {
      props[`data-label-position`] = labelPosition;
    }

    return props;
  }, [
    mode,
    color,
    type,
    width,
    height,
    borderRadius,
    border,
    logoSize,
    labelPosition,
  ]);

  useEffect(() => {
    appleApi?.auth.init({
      clientId,
      scope,
      redirectURI: redirectUri,
      state,
      nonce,
      usePopup,
    });
  }, [appleApi, scope, clientId, redirectUri, state, nonce, usePopup]);

  useEffect(() => {
    appleApi?.auth.renderButton();
  }, [appleApi, buttonProps]);

  const onSuccess = useEventCallback(onSuccessProp);
  useEffect(
    () =>
      documentEventListenerEffect(`AppleIDSignInOnSuccess`, (event) => {
        onSuccess(event.detail);
      }),
    [onSuccess],
  );

  useEffect(
    () =>
      documentEventListenerEffect(`AppleIDSignInOnFailure`, (event) => {
        const error = event.detail.error;
        if (error !== `popup_closed_by_user`) {
          console.error(`Failed to sign in with Apple, error:`, error);
        }
      }),
    [],
  );

  useEffect(() => {
    const suffix = `/appleid.auth.js`;
    const scriptUrl = `https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/${locale}${suffix}`;

    // Remove any old scripts (e.g. if the locale changed).
    // eslint-disable-next-line unicorn/prefer-spread
    const existingScripts = Array.from(document.querySelectorAll(`script`));
    const needsReset = existingScripts.some(
      (e) => e.src.endsWith(suffix) && e.src !== scriptUrl,
    );
    if (needsReset) {
      setAppleApi(undefined);
      (window.AppleID as unknown) = undefined;
      for (const script of existingScripts) {
        script.remove();
      }
    }

    if ((window.AppleID as unknown) === undefined) {
      const script = document.createElement(`script`);
      script.addEventListener(`load`, () => {
        invariant((window.AppleID as unknown) !== undefined);
        setAppleApi(window.AppleID);
      });
      script.src = scriptUrl;
      const head = document.querySelectorAll(`head`)[0];
      invariant(head != null);
      head.append(script);
    }
  }, [locale]);

  return <div id="appleid-signin" {...buttonProps}></div>;
}
