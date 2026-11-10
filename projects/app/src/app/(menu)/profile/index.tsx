import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderProvider } from "@/client/ui/HeaderProvider";
import { Icon } from "@/client/ui/Icon";
import { useAuth } from "@/client/auth";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PageSheetModal } from "@/client/ui/PageSheetModal";
import { PasskeySettings } from "@/client/ui/PasskeySettings";
import { RectButton } from "@/client/ui/RectButton";
import { SectionTitle } from "@/client/ui/SectionTitle";
import { DropdownMenu2 } from "@/client/ui/DropdownMenu2";
import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { useUserSettingToggle } from "@/client/ui/hooks/useUserSettingToggle";
import { kvStore } from "@/client/ui/replicacheOptions";
import {
  profileOverviewUserToggleSetting,
  userDisplayNameTextSetting,
} from "@/data/userSettings";
import { dropDatabase } from "replicache";
import { useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default function ProfileSettingsPage() {
  const auth = useAuth();
  const db = useDb();
  const rizzle = useRizzle();
  const router = useRouter();
  const [profileNameEditRequest, setProfileNameEditRequest] = useState(0);
  const [isRemovingProfile, setIsRemovingProfile] = useState(false);
  const [showRemoveProfileConfirmation, setShowRemoveProfileConfirmation] =
    useState(false);
  const [removeProfileError, setRemoveProfileError] = useState<string | null>(
    null,
  );
  const skillStates = useLiveQuery({
    query: (q) => q.from({ skillState: db.skillStateCollection }),
  });
  const profileOverviewSetting = useUserSettingToggle(
    profileOverviewUserToggleSetting,
  );
  const activeSession = auth.data?.activeDeviceSession;
  const accountName =
    activeSession?.userName ??
    (activeSession?.serverSessionId == null ? `Anonymous` : `User`);
  const accountDescription =
    activeSession?.authMethod === `apple`
      ? `Apple account`
      : activeSession?.authMethod === `passkey`
        ? `Passkey account`
        : null;

  const isAuthenticated =
    auth.data?.activeDeviceSession.serverSessionId != null;
  const canCreateProfile =
    activeSession?.userId == null && activeSession?.serverSessionId == null;

  const handleSignIn = () => {
    router.push(`/login`);
  };

  const handleCreateProfile = () => {
    router.push(`/login/create-account`);
  };

  async function removeProfile() {
    if (activeSession == null) {
      return;
    }

    setIsRemovingProfile(true);
    setRemoveProfileError(null);
    let syncCompleted = false;
    try {
      if (activeSession.serverSessionId != null) {
        await rizzle.replicache.push({ now: true });
        await rizzle.replicache.pull({ now: true });
        syncCompleted = true;
      }

      await rizzle.replicache.close();
      await dropDatabase(activeSession.replicacheDbName, { kvStore });
      await auth.removeActiveDeviceSession();
      router.replace(`/profile/switch`);
    } catch (error) {
      console.error(`Failed to remove device profile`, error);
      setRemoveProfileError(
        activeSession.serverSessionId != null && !syncCompleted
          ? `This profile was not removed because it could not finish syncing. Please try again when you have an internet connection.`
          : `This profile could not be removed from this device. Please try again.`,
      );
    } finally {
      setIsRemovingProfile(false);
    }
  }

  function confirmRemoveProfile() {
    if (activeSession == null) {
      return;
    }

    setRemoveProfileError(null);
    setShowRemoveProfileConfirmation(true);
  }

  if (auth.data == null) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans text-fg">Loading...</Text>
      </View>
    );
  }

  const isSyncedProfile = activeSession?.serverSessionId != null;

  return (
    <>
      <View className="gap-10">
        <View className="gap-3">
          {/* Header */}
          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Breadcrumbs>
                <Breadcrumbs.Item href="/profile">Profile</Breadcrumbs.Item>
              </Breadcrumbs>
              {isAuthenticated ? null : (
                <DropdownMenu2>
                  <DropdownMenu2.Trigger asChild>
                    <RectButton
                      variant="bare"
                      iconStart="more-horizontal"
                      accessibilityLabel="Profile options"
                    />
                  </DropdownMenu2.Trigger>
                  <DropdownMenu2.Content align="end">
                    <DropdownMenu2.Item
                      variant="destructive"
                      onPress={confirmRemoveProfile}
                    >
                      <Text>Delete guest profile</Text>
                    </DropdownMenu2.Item>
                  </DropdownMenu2.Content>
                </DropdownMenu2>
              )}
            </View>
            <HeaderProvider.ScrollTrigger title="Profile" />
          </View>

          {canCreateProfile ? (
            <View className="min-h-[60vh] items-center justify-center gap-8 py-8">
              <View className="w-full max-w-lg items-center gap-6">
                <View className="size-40 items-center justify-center rounded-full bg-fg/10">
                  <Icon icon="profile" size={48} />
                </View>
                <View className="items-center gap-2">
                  <Text className="text-center pyly-body-title text-3xl">
                    Create a profile
                  </Text>
                  <Text className="pyly-body text-center text-muted-fg">
                    Save your progress, sync across devices, and keep your
                    learning safe.
                  </Text>
                </View>
                <RectButton
                  className="w-full max-w-xs rounded-full"
                  onPressIn={handleCreateProfile}
                  variant="filled"
                >
                  Create profile
                </RectButton>
                <View className="flex-row flex-wrap items-center justify-center gap-1">
                  <Text className="pyly-body-caption text-muted-fg">
                    Have a profile already?
                  </Text>
                  <Text
                    accessibilityRole="link"
                    className="pyly-body-caption underline"
                    onPress={handleSignIn}
                  >
                    Sign in
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <View className="flex-row items-center gap-4">
                <View className="size-12 items-center justify-center rounded-full bg-fg/10">
                  <Icon icon="profile-filled" size={24} />
                </View>
                <View className="flex-1 gap-1">
                  {isAuthenticated ? (
                    <InlineEditableSettingText
                      setting={userDisplayNameTextSetting}
                      settingKey={{}}
                      placeholder="Enter profile name"
                      fallbackText={accountName}
                      textClassName="pyly-body-title"
                      editRequest={profileNameEditRequest}
                      disableAutofill
                    />
                  ) : (
                    <Text className="pyly-body-title">{accountName}</Text>
                  )}
                  {accountDescription == null ? null : (
                    <Text className="pyly-body-caption text-muted-fg">
                      {accountDescription}
                    </Text>
                  )}
                </View>
                {isAuthenticated ? (
                  <DropdownMenu2>
                    <DropdownMenu2.Trigger asChild>
                      <RectButton
                        variant="bare"
                        iconStart="more-horizontal"
                        accessibilityLabel="Profile options"
                      />
                    </DropdownMenu2.Trigger>
                    <DropdownMenu2.Content align="end">
                      <DropdownMenu2.Item
                        onPress={() => {
                          setProfileNameEditRequest((request) => request + 1);
                        }}
                      >
                        <Text>Change profile name</Text>
                      </DropdownMenu2.Item>
                    </DropdownMenu2.Content>
                  </DropdownMenu2>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {canCreateProfile ||
        profileOverviewSetting.isLoading ||
        !profileOverviewSetting.isEnabled ? null : (
          <View className="gap-3">
            <SectionTitle>Overview</SectionTitle>
            <View className="flex-row items-center gap-3">
              <Icon icon="puzzle" size={24} />
              <Text className="pyly-body-title">
                {skillStates.isLoading
                  ? `...`
                  : skillStates.data.length.toLocaleString()}
                {` skills`}
              </Text>
            </View>
          </View>
        )}

        {Platform.OS === `web` && isAuthenticated ? (
          <View className="gap-3">
            <SectionTitle>Account security</SectionTitle>
            <PasskeySettings
              key={auth.data.activeDeviceSession.serverSessionId}
            />
          </View>
        ) : null}

        {!isAuthenticated && !canCreateProfile ? (
          <View className="items-start">
            <RectButton onPressIn={handleSignIn} variant="bare">
              Sign in
            </RectButton>
          </View>
        ) : null}

        {isAuthenticated ? (
          <View className="items-start">
            <RectButton
              disabled={isRemovingProfile}
              onPress={confirmRemoveProfile}
              variant="bare"
            >
              Remove from this device
            </RectButton>
          </View>
        ) : null}
      </View>
      {showRemoveProfileConfirmation ? (
        <PageSheetModal
          disableBackgroundDismiss={isRemovingProfile}
          onDismiss={() => {
            setShowRemoveProfileConfirmation(false);
            setRemoveProfileError(null);
          }}
          onDismissRequest={(dismiss) => {
            if (!isRemovingProfile) {
              dismiss();
            }
          }}
          suspenseFallback={null}
        >
          {({ dismiss }) => (
            <View className="flex-1 justify-center gap-5 bg-bg-high p-6">
              <View className="gap-3">
                <Text className="pyly-body-title">
                  {removeProfileError ??
                    (isSyncedProfile
                      ? `Remove profile from this device?`
                      : `Delete guest profile?`)}
                </Text>
                <Text className="pyly-body text-muted-fg">
                  {removeProfileError ??
                    (isSyncedProfile
                      ? `This removes ${accountName} and its local data from this device. Your account and synced progress will remain available when you sign in again. Any pending progress will sync before removal.`
                      : `This will permanently delete the learning progress stored locally in this guest profile. This can't be undone.`)}
                </Text>
              </View>
              <View className="flex-row justify-end gap-3">
                <RectButton
                  disabled={isRemovingProfile}
                  onPress={dismiss}
                  variant="bare"
                >
                  Cancel
                </RectButton>
                <RectButton
                  color="danger"
                  disabled={isRemovingProfile}
                  onPress={() => {
                    void removeProfile();
                  }}
                  variant="filled"
                >
                  {isRemovingProfile
                    ? `Removing…`
                    : isSyncedProfile
                      ? `Remove profile`
                      : `Delete profile`}
                </RectButton>
              </View>
            </View>
          )}
        </PageSheetModal>
      ) : null}
    </>
  );
}
