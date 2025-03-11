import { useAuth } from "@/client/ui/auth";
import { RectButton2 } from "@/client/ui/RectButton2";
import { SignInWithAppleButton } from "@/client/ui/SignInWithAppleButton";
import { invariant } from "@haohaohow/lib/invariant";
import * as AppleAuthentication from "expo-apple-authentication";
import { Link } from "expo-router";
import { Platform, Text, View } from "react-native";
import z from "zod";

export default function LoginPage() {
  const auth = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-[10px] bg-background">
      <Text className="font-bold text-text">Login</Text>
      <View className="gap-2">
        {auth.data?.allClientSessions.map((x, i) => (
          <View key={i} className="flex-row gap-2 border-y">
            <View className="flex-1">
              <Text className="text-text">Session ID: {x.serverSessionId}</Text>
              <Text className="text-text">DB name: {x.replicacheDbName}</Text>
            </View>
            <RectButton2
              onPressIn={() => {
                auth.signInExisting(
                  (s) => s.replicacheDbName === x.replicacheDbName,
                );
              }}
            >
              Log in
            </RectButton2>
          </View>
        ))}
      </View>
      <Text className="text-text">
        Session ID: {auth.data?.clientSession.serverSessionId}
      </Text>
      <Text className="text-text">
        DB name: {auth.data?.clientSession.replicacheDbName}
      </Text>

      <RectButton2
        onPressIn={() => {
          auth.signOut();
        }}
      >
        Logout
      </RectButton2>

      {Platform.OS === `web` ? (
        <SignInWithAppleButton
          clientId="how.haohao.app"
          onSuccess={(data) => {
            void auth.signInWithApple(data.authorization.id_token);
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
            } catch (error) {
              const err = z.object({ code: z.string() }).safeParse(error);
              if (err.success) {
                switch (err.data.code) {
                  case `ERR_REQUEST_CANCELED`: {
                    // handle that the user canceled the sign-in flow
                    console.error(`request canceled`);
                    break;
                  }
                  default: {
                    console.error(
                      `unknown error code=${err.data.code}, error=`,
                      err.data,
                    );
                  }
                }
              } else {
                console.error(`unknown error (no code), error=`, error);
              }

              return;
            }

            invariant(credential.identityToken != null);

            void auth.signInWithApple(credential.identityToken);
          }}
        />
      ) : null}
      <Link href="/dev/ui" asChild>
        <RectButton2 variant="filled">UI</RectButton2>
      </Link>

      <GoHomeButton />
    </View>
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton2 textClassName="font-bold text-text text-xl">
        Back
      </RectButton2>
    </Link>
  </View>
);
