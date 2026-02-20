import type { UseAuth2Data } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { SessionStoreProvider } from "@/client/ui/SessionStoreProvider";
import { useDb } from "@/client/ui/hooks/useDb";
import { useLiveQuery } from "@tanstack/react-db";
import { Text, View } from "react-native";

type DeviceSession = UseAuth2Data[`activeDeviceSession`];

interface SessionInfoCardProps {
  session: DeviceSession;
  isActive: boolean;
  onSwitch?: () => void;
  showDetails?: boolean;
}

export function SessionInfoCard({
  session,
  isActive,
  onSwitch,
  showDetails = true,
}: SessionInfoCardProps) {
  return (
    <SessionStoreProvider dbName={session.replicacheDbName}>
      <SessionInfoCardInner
        session={session}
        isActive={isActive}
        onSwitch={onSwitch}
        showDetails={showDetails}
      />
    </SessionStoreProvider>
  );
}

function SessionInfoCardInner({
  session,
  isActive,
  onSwitch,
  showDetails,
}: SessionInfoCardProps) {
  const db = useDb();
  const skillResult = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );

  const isAuthenticated = session.serverSessionId != null;
  const displayName =
    (session.userName ?? null) === null
      ? isAuthenticated
        ? `User`
        : `Anonymous`
      : session.userName;

  const authMethodBadge =
    session.authMethod === `apple`
      ? `🍎 Apple`
      : session.authMethod === `passkey`
        ? `🔑 Passkey`
        : `👤 Anonymous`;

  const skillCount = skillResult.isLoading ? `...` : skillResult.data.length;

  return (
    <View
      className={`
        gap-3 rounded-lg border p-4

        ${isActive ? `border-fg bg-bg-high` : `bg-bg-high`}
      `}
    >
      {/* Header with name and active indicator */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-fg">{displayName}</Text>
          <Text className="text-sm text-fg-dim">{authMethodBadge}</Text>
        </View>
        {isActive && (
          <View className="rounded-full bg-fg px-3 py-1">
            <Text className="text-xs font-semibold text-bg">Current</Text>
          </View>
        )}
      </View>

      {/* Details */}
      {showDetails === true && (
        <View className="gap-1">
          <Text className="text-sm text-fg-dim">
            {skillCount}
            {` `}
            {typeof skillCount === `number` && skillCount === 1
              ? `skill`
              : `skills`}
          </Text>
          {session.lastActive && (
            <Text className="text-sm text-fg-dim">
              Last active: {new Date(session.lastActive).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Switch button */}
      {!isActive && onSwitch && (
        <RectButton onPressIn={onSwitch} variant="filled">
          Switch to this account
        </RectButton>
      )}
    </View>
  );
}
