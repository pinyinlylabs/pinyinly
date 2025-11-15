import { useAuth } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { Link } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

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
      // Automatically switch to signup mode instead of showing an error
      setMode(`signup`);
      setError(null);
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

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton textClassName="font-bold text-fg text-xl">Back</RectButton>
    </Link>
  </View>
);


