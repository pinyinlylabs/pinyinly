import { useAuth } from "@/client/auth";
import { useDb } from "@/client/ui/hooks/useDb";
import { RectButton } from "@/client/ui/RectButton";
import { SessionStoreProvider } from "@/client/ui/SessionStoreProvider";
import { SignInWithAppleButton } from "@/client/ui/SignInWithAppleButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";

export default function LoginPage() {
  const auth = useAuth();

  const [passkeyName, setPasskeyName] = useState(``);
  const [showDevTools, setShowDevTools] = useState(false);
  // Web: Show friendly user-facing sign-up/log-in interface
  if (Platform.OS === `web`) {
    return (
      <ScrollView className="flex-1 bg-bg">
        <View className="items-center justify-center gap-8 px-6 py-12">
          {/* Header */}
          <View className="max-w-lg gap-2 text-center">
            <Text className="text-3xl font-bold text-fg">
              Welcome to Pinyinly
            </Text>
            <Text className="text-base text-fg-dim">
              Learn to read, write, and speak Mandarin Chinese with spaced
              repetition.
            </Text>
          </View>

          {/* Sign Up Section */}
          <View
            className={`w-full max-w-lg gap-4 rounded-lg border bg-bg-high p-6`}
          >
            <View className="gap-2">
              <Text className="text-lg font-semibold text-fg">New here?</Text>
              <Text className="text-sm text-fg-dim">
                Create an account to start learning.
              </Text>
            </View>

            {/* Apple Sign-Up */}
            <View className="gap-3">
              <SignInWithAppleButton
                clientId="ly.pinyin.auth"
                onSuccess={(data) => {
                  void auth.logInWithApple(data.authorization.id_token);
                }}
                redirectUri={`https://${location.hostname}/api/auth/login/apple/callback`}
              />
              <Text className="text-center text-xs text-fg-dim">
                Sign up with your Apple ID
              </Text>
            </View>

            {/* Passkey Sign-Up */}
            <View className="gap-3">
              <View className="gap-2">
                <TextInputSingle
                  placeholder={`Your name`}
                  onChangeText={(text) => {
                    setPasskeyName(text);
                  }}
                  value={passkeyName}
                />
              </View>
              <RectButton
                onPressIn={() => {
                  auth
                    .signUpWithPasskey({ name: passkeyName })
                    .catch((error: unknown) => {
                      console.error(`failed to sign up with passkey`, error);
                    });
                }}
              >
                Create account with Passkey
              </RectButton>
              <Text className="text-center text-xs text-fg-dim">
                Or use a passkey (fingerprint, face, or security key)
              </Text>
            </View>
          </View>

          {/* Log In Section */}
          <View
            className={`w-full max-w-lg gap-4 rounded-lg border bg-bg-high p-6`}
          >
            <View className="gap-2">
              <Text className="text-lg font-semibold text-fg">
                Already have an account?
              </Text>
              <Text className="text-sm text-fg-dim">
                Sign in to continue learning.
              </Text>
            </View>

            {/* Passkey Log In */}
            <View className="gap-3">
              <RectButton
                onPressIn={() => {
                  auth.logInWithPasskey().catch((error: unknown) => {
                    console.error(`failed to log in with passkey`, error);
                  });
                }}
              >
                Log in with Passkey
              </RectButton>
              <Text className="text-center text-xs text-fg-dim">
                Use your saved passkey to sign in
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-4 gap-2" style={{ width: `100%`, maxWidth: 448 }}>
            <DevToolsSection
              collapsible
              isOpen={showDevTools}
              onToggle={() => {
                setShowDevTools(!showDevTools);
              }}
              styled
            />
            <GoHomeButton />
          </View>
        </View>
      </ScrollView>
    );
  }

  // iOS and other platforms: Return to original focused UI
  return (
    <View className="flex-1 items-center justify-center gap-[10px] bg-bg">
      <Text className="font-bold text-fg">Sign up</Text>
      <View className="gap-2">
        <View className="flex-row gap-2 border-y">
          <TextInputSingle
            placeholder={`Name`}
            onChangeText={(text) => {
              setPasskeyName(text);
            }}
            value={passkeyName}
          />
          <RectButton
            onPressIn={() => {
              auth
                .signUpWithPasskey({ name: passkeyName })
                .catch((error: unknown) => {
                  console.error(`failed to sign up with passkey`, error);
                });
            }}
          >
            Create Passkey
          </RectButton>
        </View>
      </View>

      <Text className="font-bold text-fg">Log in</Text>
      <View className="gap-2">
        <View className="flex-row gap-2 border-y">
          <RectButton
            onPressIn={() => {
              auth.logInWithPasskey().catch((error: unknown) => {
                console.error(`failed to log in with passkey`, error);
              });
            }}
          >
            Log in with Passkey
          </RectButton>
        </View>
      </View>

      <DevToolsSection />

      <RectButton
        onPressIn={() => {
          auth.signOut();
        }}
      >
        Logout
      </RectButton>

      <GoHomeButton />
    </View>
  );
}

function ServerSessionIdLoginForm() {
  const auth = useAuth();
  const [input, setInput] = useState(``);

  return (
    <TextInputSingle
      placeholder={`session ID`}
      onKeyPress={(e) => {
        if (e.nativeEvent.key === `Enter`) {
          auth.logInWithServerSessionId(input);
          e.preventDefault();
        }
      }}
      value={input}
      onChangeText={(text) => {
        setInput(text);
      }}
    />
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton className="text-xl font-bold text-fg">Back</RectButton>
    </Link>
  </View>
);

function SkillCount() {
  const db = useDb();
  const result = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );
  const count = result.data.length;

  return result.isLoading ? (
    <Text className="text-fg">Loading…</Text>
  ) : (
    <Text className="text-fg">{count} words</Text>
  );
}

interface DevToolsSectionProps {
  /** If true, shows a toggle button to reveal dev tools (web behavior) */
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  /** If true, wraps in a styled container (web behavior) */
  styled?: boolean;
}

function DevToolsSection({
  collapsible = false,
  isOpen = false,
  onToggle,
  styled = false,
}: DevToolsSectionProps) {
  const auth = useAuth();

  if (!__DEV__) {
    return null;
  }

  const content = (
    <>
      <Text className="font-bold text-fg">Dev: Session List</Text>
      <View className="gap-2">
        {auth.data?.allDeviceSessions.map((x, i) => (
          <SessionStoreProvider key={i} dbName={x.replicacheDbName}>
            <View
              key={i}
              className={
                styled ? `gap-1 border-y p-2` : `flex-row gap-2 border-y`
              }
            >
              <View className={styled ? undefined : `flex-1`}>
                <Text className={styled ? `text-sm text-fg` : `text-fg`}>
                  Skill count: <SkillCount />
                </Text>
                <Text className={styled ? `text-sm text-fg` : `text-fg`}>
                  Session ID: {x.serverSessionId}
                </Text>
                <Text className={styled ? `text-sm text-fg` : `text-fg`}>
                  DB name: {x.replicacheDbName}
                </Text>
              </View>
              <RectButton
                onPressIn={() => {
                  auth.logInToExistingDeviceSession(
                    (s) => s.replicacheDbName === x.replicacheDbName,
                  );
                }}
              >
                Log in
              </RectButton>
            </View>
          </SessionStoreProvider>
        ))}
      </View>
      <Text className={styled ? `text-sm text-fg` : `text-fg`}>
        Active Session ID: {auth.data?.activeDeviceSession.serverSessionId}
      </Text>
      <Text className={styled ? `text-sm text-fg` : `text-fg`}>
        Active DB name: {auth.data?.activeDeviceSession.replicacheDbName}
      </Text>
      <ServerSessionIdLoginForm />
      <Link href="/dev/demo" asChild>
        <RectButton variant="filled">Dev demo</RectButton>
      </Link>
    </>
  );

  if (collapsible && onToggle) {
    return (
      <>
        <RectButton onPressIn={onToggle} variant="filled">
          {isOpen ? `Hide` : `Show`} Dev Tools
        </RectButton>
        {isOpen ? (
          <View className="gap-3 rounded-lg border bg-bg-high p-4">
            {content}
          </View>
        ) : null}
      </>
    );
  }

  return content;
}
