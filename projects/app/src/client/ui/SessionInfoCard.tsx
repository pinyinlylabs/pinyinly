import type { UseAuth2Data } from "@/client/auth";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

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
    <SessionInfoCardInner
      session={session}
      isActive={isActive}
      onSwitch={onSwitch}
      showDetails={showDetails}
    />
  );
}

function SessionInfoCardInner({
  session,
  isActive,
  onSwitch,
  showDetails,
}: SessionInfoCardProps) {
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
          <Text className="font-sans text-base font-semibold text-fg">
            {displayName}
          </Text>
          <Text className="font-sans text-sm text-muted-fg">
            {authMethodBadge}
          </Text>
        </View>
        {isActive && (
          <View className="rounded-full bg-fg px-3 py-1">
            <Text className="font-sans text-xs font-semibold text-bg">
              Current
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      {showDetails === true && (
        <View className="gap-1">
          {session.lastActive && (
            <Text className="font-sans text-sm text-muted-fg">
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
