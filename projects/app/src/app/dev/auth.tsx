import { useAuth } from "@/client/auth";
import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import { RectButton } from "@/client/ui/RectButton";
import { SessionStoreProvider } from "@/client/ui/SessionStoreProvider";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function DevAuthPage() {
  return (
    <View className="flex-1 bg-bg">
      <View className="px-8 py-6">
        <Text className="pyly-body-title mb-2 text-fg">Authentication Development Tools</Text>
        <Text className="pyly-body mb-6 text-fg/70">
          Manage sessions, debug authentication flows, and test login functionality.
        </Text>
        
        <DeveloperDebugSection />
      </View>
    </View>
  );
}

function DeveloperDebugSection() {
  const auth = useAuth();

  return (
    <View className="gap-6">
      {/* Existing Sessions */}
      {auth.data?.allDeviceSessions && auth.data.allDeviceSessions.length > 0 && (
        <View className="gap-4">
          <Text className="pyly-body-heading text-fg">Existing Sessions</Text>
          {auth.data.allDeviceSessions.map((session, i) => (
            <SessionStoreProvider key={i} dbName={session.replicacheDbName}>
              <View className="flex-row items-center gap-2 rounded-xl bg-bg-loud p-4">
                <View className="flex-1">
                  <Text className="pyly-body text-fg">
                    Session: {session.serverSessionId ?? `Anonymous`}
                  </Text>
                  <Text className="pyly-body-caption text-fg/60">
                    Skills: <SkillCount />
                  </Text>
                  <Text className="pyly-body-caption text-fg/60">
                    DB: {session.replicacheDbName}
                  </Text>
                </View>
                <RectButton
                  variant="option"
                  onPress={() => {
                    auth.logInToExistingDeviceSession(
                      (s) => s.replicacheDbName === session.replicacheDbName,
                    );
                  }}
                >
                  Use Session
                </RectButton>
              </View>
            </SessionStoreProvider>
          ))}
        </View>
      )}

      {/* Current Session Info */}
      <View className="gap-2">
        <Text className="pyly-body-heading text-fg">Current Session</Text>
        <View className="rounded-xl bg-bg-loud p-4">
          <Text className="pyly-body text-fg">
            Session ID: {auth.data?.activeDeviceSession.serverSessionId ?? `Anonymous`}
          </Text>
          <Text className="pyly-body-caption text-fg/60">
            Database: {auth.data?.activeDeviceSession.replicacheDbName}
          </Text>
        </View>
      </View>

      {/* Session ID Login */}
      <View className="gap-2">
        <Text className="pyly-body-heading text-fg">Session ID Login</Text>
        <ServerSessionIdLoginForm />
      </View>

      {/* Dev Actions */}
      <View className="gap-2">
        <Text className="pyly-body-heading text-fg">Development Actions</Text>
        <View className="flex-row gap-2">
          <RectButton
            variant="outline"
            onPress={() => { auth.signOut(); }}
          >
            Sign Out
          </RectButton>
          <Link href="/dev/ui" asChild>
            <RectButton variant="outline">UI Components</RectButton>
          </Link>
          <Link href="/dev/api" asChild>
            <RectButton variant="outline">API Debug</RectButton>
          </Link>
        </View>
      </View>
    </View>
  );
}

function ServerSessionIdLoginForm() {
  const auth = useAuth();
  const [input, setInput] = useState(``);

  return (
    <View className="gap-2">
      <Text className="pyly-body-caption text-fg/60">
        Enter a server session ID to log in directly
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <TextInputSingle
            placeholder="Enter session ID"
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
        </View>
        <RectButton
          variant="option"
          onPress={() => {
            auth.logInWithServerSessionId(input);
          }}
          disabled={!input.trim()}
        >
          Login
        </RectButton>
      </View>
    </View>
  );
}

function SkillCount() {
  const result = useRizzleQuery([`wordCount`], async (r, tx) => {
    const skillStates = await r.query.skillState.scan(tx).toArray();
    return skillStates.length;
  });

  return result.isPending ? (
    <Text>Loading…</Text>
  ) : (
    <Text>{result.data} words</Text>
  );
}