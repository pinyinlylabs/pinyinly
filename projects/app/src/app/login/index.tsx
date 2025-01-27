import { trpc } from "@/client/trpc";
import { RectButton2 } from "@/components/RectButton2";
import { SignInWithAppleButton } from "@/components/SignInWithAppleButton";
import {
  useClientStorageMutation,
  useClientStorageQuery,
} from "@/util/clientStorage";
import { invariant } from "@haohaohow/lib/invariant";
import * as AppleAuthentication from "expo-apple-authentication";
import { Link } from "expo-router";
import { useCallback } from "react";
import { Platform, Text, View } from "react-native";
import z from "zod";

const SESSION_ID_KEY = `sessionId`;

export default function LoginPage() {
  const sessionIdQuery = useClientStorageQuery(SESSION_ID_KEY);
  const sessionIdMutation = useClientStorageMutation(SESSION_ID_KEY);
  const signInWithAppleMutate = trpc.auth.signInWithApple.useMutation();

  const createSession = useCallback(
    async (identityToken: string) => {
      const { session } = await signInWithAppleMutate.mutateAsync({
        identityToken,
      });
      sessionIdMutation.mutate(session.id);
    },
    [sessionIdMutation, signInWithAppleMutate],
  );

  return (
    <View className="flex-1 items-center justify-center gap-[10px]">
      <Text>Login</Text>
      <Text>Session ID: {sessionIdQuery.data}</Text>

      <RectButton2
        onPressIn={() => {
          sessionIdMutation.mutate(null);
        }}
      >
        Logout
      </RectButton2>

      {Platform.OS === `web` ? (
        <SignInWithAppleButton
          clientId="how.haohao.app"
          onSuccess={(data) => {
            void createSession(data.authorization.id_token);
          }}
          redirectUri={`https://${location.hostname}/api/auth/login/apple/callback`}
        />
      ) : null}

      {Platform.OS === `ios` ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          className="h-[44px] w-[200px]"
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={async () => {
            let credential;
            try {
              credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
              });
            } catch (e) {
              const err = z.object({ code: z.string() }).safeParse(e);
              if (err.success) {
                switch (err.data.code) {
                  case `ERR_REQUEST_CANCELED`:
                    // handle that the user canceled the sign-in flow
                    console.error(`request canceled`);
                    break;
                  default:
                    console.error(
                      `unknown error code=${err.data.code}, error=`,
                      err.data,
                    );
                }
              } else {
                console.error(`unknown error (no code), error=`, e);
              }

              return;
            }

            invariant(credential.identityToken != null);

            void createSession(credential.identityToken);
          }}
        />
      ) : null}

      <GoHomeButton />
    </View>
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link href="/dashboard" asChild>
      <RectButton2 textClassName="font-bold text-text text-xl">
        Back
      </RectButton2>
    </Link>
  </View>
);
