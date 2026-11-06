import { passkeyErrorMessage, useSupportsPasskeys } from "@/client/passkey";
import { trpc } from "@/client/trpc";
import { startRegistration } from "@simplewebauthn/browser";
import { useLiveQuery } from "@tanstack/react-db";
import { useRef, useState } from "react";
import { ScrollView } from "react-native";
import { formatRelativeTime } from "@/util/date";
import { useDb } from "./hooks/useDb";
import { DropdownMenu2 } from "./DropdownMenu2";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { Text } from "./Text";
import { TextInputSingle } from "./TextInputSingle";
import { View } from "./View";

export function PasskeySettings() {
  const supported = useSupportsPasskeys();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passkeyToRemove, setPasskeyToRemove] = useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const db = useDb();
  const passkeysQuery = useLiveQuery(db.passkeyCollection);
  const passkeys = passkeysQuery.data;
  const start = trpc.auth.startAddPasskey.useMutation();
  const complete = trpc.auth.completeAddPasskey.useMutation();
  const rename = trpc.auth.renamePasskey.useMutation();
  const remove = trpc.auth.removePasskey.useMutation();

  async function run(action: () => Promise<unknown>) {
    if (pendingRef.current) {
      return false;
    }
    pendingRef.current = true;
    setPending(true);
    setErrorMessage(null);
    try {
      await action();
      await db.passkeyCollection.utils.retry();
      return true;
    } catch (error) {
      console.error(`Passkey management failed`, error);
      setErrorMessage(passkeyErrorMessage(error));
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <View className="gap-3">
        <Text className="pyly-body-title text-fg">Account security</Text>
        <View className="flex-row items-center justify-between gap-4 rounded-lg border p-4">
          <View className="flex-1 gap-1">
            <Text className="font-sans text-base font-semibold text-fg">
              Passkeys
            </Text>
            <Text className="text-muted-fg">
              Sign in using your device&apos;s built-in security.
            </Text>
          </View>
          <RectButton
            onPress={() => {
              setIsOpen(true);
            }}
          >
            Manage passkeys
          </RectButton>
        </View>
      </View>
      {isOpen ? (
        <PageSheetModal
          onDismiss={() => {
            setIsOpen(false);
          }}
          onDismissRequest={(dismiss) => {
            if (!pending) {
              dismiss();
            }
          }}
          disableBackgroundDismiss={pending}
          suspenseFallback={null}
        >
          {({ dismiss }) => (
            <View
              className="
                flex-1 gap-4 p-5

                sm:p-6
              "
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <Text className="pyly-body-title text-fg">
                    Manage passkeys
                  </Text>
                  <Text className="text-muted-fg">
                    Use your device&apos;s built-in security, such as a
                    fingerprint, face recognition, or screen lock, to sign in.
                  </Text>
                </View>
                <RectButton
                  variant="bare"
                  iconStart="close"
                  accessibilityLabel="Close passkey settings"
                  disabled={pending}
                  onPress={dismiss}
                />
              </View>
              <ScrollView className="min-h-0 flex-1">
                <View className="gap-2">
                  <Text className="font-sans text-base font-semibold text-fg">
                    Your passkeys
                  </Text>
                  {passkeysQuery.isLoading && !passkeysQuery.isError ? (
                    <Text className="text-fg">Loading passkeys...</Text>
                  ) : null}
                  {passkeysQuery.isError ? (
                    <View className="gap-2">
                      <Text accessibilityRole="alert" className="text-fg">
                        Could not load passkeys.
                      </Text>
                      <RectButton
                        onPress={() => {
                          void db.passkeyCollection.utils.retry();
                        }}
                      >
                        Retry
                      </RectButton>
                    </View>
                  ) : null}
                  {passkeys.map((passkey) => (
                    <PasskeyRow
                      key={passkey.id}
                      name={passkey.name}
                      createdAt={passkey.createdAt}
                      lastUsedAt={passkey.lastUsedAt}
                      disabled={pending}
                      canRemove={passkeys.length > 1}
                      onRename={async (newName) =>
                        run(async () =>
                          rename.mutateAsync({ id: passkey.id, name: newName }),
                        )
                      }
                      onRemoveRequest={() => {
                        setPasskeyToRemove({
                          id: passkey.id,
                          name: passkey.name,
                        });
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
              <View className="gap-2">
                {supported ? null : (
                  <Text className="text-muted-fg">
                    Adding passkeys requires a supported web browser on HTTPS or
                    localhost.
                  </Text>
                )}
                {pending ? <Text className="text-fg">Working...</Text> : null}
                {errorMessage == null ? null : (
                  <Text accessibilityRole="alert" className="text-fg">
                    {errorMessage}
                  </Text>
                )}
                <RectButton
                  color="blue"
                  variant="filled"
                  disabled={!supported || pending}
                  onPress={() => {
                    void run(async () => {
                      const { options, cookie } = await start.mutateAsync();
                      const response = await startRegistration({
                        optionsJSON: options,
                      });
                      await complete.mutateAsync({
                        response,
                        cookie,
                      });
                    });
                  }}
                >
                  Add new passkey
                </RectButton>
                <RectButton disabled={pending} onPress={dismiss}>
                  Cancel
                </RectButton>
              </View>
            </View>
          )}
        </PageSheetModal>
      ) : null}
      {passkeyToRemove == null ? null : (
        <PageSheetModal
          onDismiss={() => {
            setPasskeyToRemove(null);
          }}
          onDismissRequest={(dismiss) => {
            if (!pending) {
              dismiss();
            }
          }}
          disableBackgroundDismiss={pending}
          suspenseFallback={null}
        >
          {({ dismiss }) => (
            <View
              className="
                gap-4 p-5

                sm:p-6
              "
            >
              <Text className="pyly-body-title text-fg">Remove passkey?</Text>
              <Text className="text-muted-fg">
                Remove this passkey? It will no longer work for new logins.
              </Text>
              {errorMessage == null ? null : (
                <Text accessibilityRole="alert" className="text-fg">
                  {errorMessage}
                </Text>
              )}
              <View className="flex-row justify-end gap-2">
                <RectButton disabled={pending} onPress={dismiss}>
                  Cancel
                </RectButton>
                <RectButton
                  color="danger"
                  variant="filled"
                  disabled={pending}
                  onPress={() => {
                    void run(async () =>
                      remove.mutateAsync({ id: passkeyToRemove.id }),
                    ).then((removed) => {
                      if (removed) {
                        dismiss();
                      }
                    });
                  }}
                >
                  Remove passkey
                </RectButton>
              </View>
            </View>
          )}
        </PageSheetModal>
      )}
    </>
  );
}

function PasskeyRow({
  name,
  createdAt,
  lastUsedAt,
  disabled,
  canRemove,
  onRename,
  onRemoveRequest,
}: {
  name: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  disabled: boolean;
  canRemove: boolean;
  onRename: (name: string) => Promise<boolean>;
  onRemoveRequest: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? ``);
  const saveStartedRef = useRef(false);
  const isUnnamed = name == null || name.length === 0;
  const displayName = isUnnamed ? `Unnamed passkey` : name;
  const usageLabel =
    lastUsedAt == null
      ? createdAt == null
        ? `Set up date unknown`
        : `Set up ${formatTimeAgo(createdAt)}`
      : `Used ${formatTimeAgo(lastUsedAt)}`;

  function saveDraft() {
    if (saveStartedRef.current) {
      return;
    }

    const newName = draft.trim();
    if (newName.length === 0 || newName === (name ?? ``)) {
      saveStartedRef.current = true;
      setDraft(name ?? ``);
      setIsEditing(false);
      return;
    }

    saveStartedRef.current = true;
    void onRename(newName).then((renamed) => {
      if (renamed) {
        setIsEditing(false);
      } else {
        saveStartedRef.current = false;
      }
    });
  }

  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-fg-bg10 py-3">
      <View className="min-w-0 flex-1 gap-2">
        {isEditing ? (
          <TextInputSingle
            placeholder="Passkey name"
            accessibilityLabel="Passkey name"
            value={draft}
            onChangeText={setDraft}
            onBlur={saveDraft}
            onKeyPress={(event) => {
              if (event.nativeEvent.key === `Enter`) {
                event.preventDefault();
                saveDraft();
              } else if (event.nativeEvent.key === `Escape`) {
                event.preventDefault();
                saveStartedRef.current = true;
                setDraft(name ?? ``);
                setIsEditing(false);
              }
            }}
            maxLength={100}
            disabled={disabled}
            autoFocus
            variant="bare"
            className="
              rounded-md bg-bg-high px-3 py-2 text-fg outline-2 -outline-offset-2 outline-blue
            "
          />
        ) : (
          <Text
            className={`
              font-sans text-sm font-semibold

              ${isUnnamed ? `text-fg-dim` : `text-fg`}
            `}
          >
            {displayName}
          </Text>
        )}
        <Text className="text-muted-fg">{usageLabel}</Text>
      </View>
      {isEditing ? null : (
        <DropdownMenu2>
          <DropdownMenu2.Trigger asChild>
            <RectButton
              variant="bare"
              iconStart="more-horizontal"
              accessibilityLabel={`More options for ${displayName}`}
              disabled={disabled}
            />
          </DropdownMenu2.Trigger>
          <DropdownMenu2.Content align="end">
            <DropdownMenu2.Item
              disabled={disabled}
              onPress={() => {
                setDraft(name ?? ``);
                saveStartedRef.current = false;
                setIsEditing(true);
              }}
            >
              <Text>Rename</Text>
            </DropdownMenu2.Item>
            <DropdownMenu2.Item
              variant="destructive"
              disabled={disabled || !canRemove}
              onPress={onRemoveRequest}
            >
              <Text>Remove</Text>
            </DropdownMenu2.Item>
          </DropdownMenu2.Content>
        </DropdownMenu2>
      )}
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const relativeTime = formatRelativeTime(date);
  return relativeTime.startsWith(`in `)
    ? `${relativeTime.slice(3)} ago`
    : relativeTime;
}
