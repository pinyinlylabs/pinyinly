import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { SignInWithAppleButton } from "@/client/ui/SignInWithAppleButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { invariant } from "@pinyinly/lib/invariant";
import * as AppleAuthentication from "expo-apple-authentication";
import { Link } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import z from "zod/v4";

export default function LoginPage() {
  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="items-center py-8 pt-safe">
        <Text className="pyly-body-title mb-2 text-fg">Welcome to Pinyinly</Text>
        <Text className="pyly-body px-8 text-center text-fg/70">
          Sign in securely with your passkey or create a new account
        </Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 gap-6 px-8">
        {/* Passkey Authentication Section */}
        <PasskeyAuthSection />

        {/* Alternative Sign-in Options */}
        <AlternativeSignInSection />
      </View>

      {/* Back to App Button */}
      <View className="px-8 pb-4 pb-safe">
        <GoHomeButton />
        {__DEV__ && (
          <View className="mt-2">
            <Link href="/dev" asChild>
              <RectButton variant="bare">
                <Text className="pyly-body-caption text-center text-fg/60 underline">
                  Development Tools
                </Text>
              </RectButton>
            </Link>
          </View>
        )}
      </View>
    </View>
  );
}

function PasskeyAuthSection() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<`signin` | `signup`>(`signin`);
  const [name, setName] = useState(``);

  const handlePasskeySignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await auth.logInWithPasskey();
    } catch (error_) {
      console.error(`Passkey sign-in failed:`, error_);
      setError(`Sign-in failed. Please try again or create an account.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignUp = async () => {
    if (!name.trim()) {
      setError(`Please enter your name to create an account.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await auth.signUpWithPasskey({ name: name.trim() });
    } catch (error_) {
      console.error(`Passkey sign-up failed:`, error_);
      setError(`Account creation failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="gap-4">
      <Text className="pyly-body-heading text-center text-fg">
        {mode === `signin` ? `Sign In` : `Create Account`}
      </Text>

      {error != null && error.length > 0 && (
        <View className="rounded-xl border border-red/20 bg-red/10 p-3">
          <Text className="pyly-body text-center text-red">{error}</Text>
        </View>
      )}

      {mode === `signup` && (
        <TextInputSingle
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
        />
      )}

      <RectButton
        variant="filled"
        onPress={() => {
          void (mode === `signin` ? handlePasskeySignIn() : handlePasskeySignUp());
        }}
        disabled={isLoading || (mode === `signup` && !name.trim())}
      >
        {isLoading 
          ? (mode === `signin` ? `Signing in...` : `Creating account...`) 
          : (mode === `signin` ? `🔐 Sign in with Passkey` : `🔐 Create account with Passkey`)
        }
      </RectButton>

      {Platform.OS === `web` && (
        <input 
          type="button" 
          autoComplete="webauthn" 
          style={{ opacity: 0, position: `absolute`, pointerEvents: `none` }}
        />
      )}

      <View className="flex-row justify-center gap-2">
        <Text className="pyly-body text-fg/60">
          {mode === `signin` ? `Don't have an account?` : `Already have an account?`}
        </Text>
        <RectButton
          variant="bare"
          onPress={() => {
            setMode(mode === `signin` ? `signup` : `signin`);
            setError(null);
            setName(``);
          }}
        >
          <Text className="pyly-body font-medium text-fg underline">
            {mode === `signin` ? `Create one` : `Sign in`}
          </Text>
        </RectButton>
      </View>
    </View>
  );
}

function AlternativeSignInSection() {
  const auth = useAuth();

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <View className="h-px flex-1 bg-fg/20" />
        <Text className="pyly-body-caption text-fg/60">or</Text>
        <View className="h-px flex-1 bg-fg/20" />
      </View>

      {/* Apple Sign In */}
      {Platform.OS === `web` ? (
        <SignInWithAppleButton
          clientId="how.haohao.app"
          onSuccess={(data) => {
            void auth.logInWithApple(data.authorization.id_token);
          }}
          redirectUri={`https://${location.hostname}/api/auth/login/apple/callback`}
        />
      ) : Platform.OS === `ios` ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          className="h-[44px]"
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
                    console.error(`Apple sign-in canceled`);
                    break;
                  }
                  default: {
                    console.error(`Apple sign-in error:`, err.data);
                  }
                }
              } else {
                console.error(`Unknown Apple sign-in error:`, error);
              }
              return;
            }

            invariant(credential.identityToken != null);
            void auth.logInWithApple(credential.identityToken);
          }}
        />
      ) : null}
    </View>
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton textClassName="font-bold text-fg text-xl">Back</RectButton>
    </Link>
  </View>
);


