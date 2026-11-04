import { passkeyErrorMessage, useSupportsPasskeys } from "@/client/passkey";
import { trpc } from "@/client/trpc";
import { startRegistration } from "@simplewebauthn/browser";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { useDb } from "./hooks/useDb";
import { RectButton } from "./RectButton";
import { Text } from "./Text";
import { TextInputSingle } from "./TextInputSingle";
import { View } from "./View";

export function PasskeySettings() {
  const supported = useSupportsPasskeys();
  const [name, setName] = useState(``);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const db = useDb();
  const passkeysQuery = useLiveQuery((q) =>
    q.from({ passkey: db.passkeyCollection }),
  );
  const start = trpc.auth.startAddPasskey.useMutation();
  const complete = trpc.auth.completeAddPasskey.useMutation();
  const rename = trpc.auth.renamePasskey.useMutation();
  const remove = trpc.auth.removePasskey.useMutation();

  async function run(action: () => Promise<unknown>) {
    if (pending) {
      return;
    }
    setPending(true);
    setErrorMessage(null);
    try {
      await action();
      await db.passkeyCollection.utils.refetch();
    } catch (error) {
      console.error(`Passkey management failed`, error);
      setErrorMessage(passkeyErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="gap-3">
      <Text className="pyly-body-title">Passkeys</Text>
      <Text className="text-muted-fg">
        Passkeys belong to this account on this server. Your last passkey cannot
        be removed.
      </Text>
      {passkeysQuery.isLoading ? (
        <Text className="text-fg">Loading passkeys...</Text>
      ) : null}
      {passkeysQuery.isError ? (
        <View className="gap-2">
          <Text accessibilityRole="alert" className="text-fg">
            Could not load passkeys.
          </Text>
          <RectButton
            onPress={() => {
              void db.passkeyCollection.utils.refetch();
            }}
          >
            Retry
          </RectButton>
        </View>
      ) : null}
      {passkeysQuery.data.map((passkey) => (
        <PasskeyRow
          key={passkey.id}
          name={passkey.name}
          createdAt={passkey.createdAt}
          lastUsedAt={passkey.lastUsedAt}
          disabled={pending}
          canRemove={passkeysQuery.data.length > 1}
          confirming={removingId === passkey.id}
          onConfirm={() => {
            setRemovingId(passkey.id);
          }}
          onCancel={() => {
            setRemovingId(null);
          }}
          onRename={(newName) => {
            void run(async () =>
              rename.mutateAsync({ id: passkey.id, name: newName }),
            );
          }}
          onRemove={() => {
            void run(async () => {
              await remove.mutateAsync({ id: passkey.id });
              setRemovingId(null);
            });
          }}
        />
      ))}
      <TextInputSingle
        placeholder="Passkey name (e.g. iCloud Keychain)"
        accessibilityLabel="New passkey name"
        value={name}
        onChangeText={setName}
        maxLength={100}
        disabled={pending}
      />
      <RectButton
        disabled={!supported || pending}
        onPress={() => {
          void run(async () => {
            const trimmedName = name.trim();
            const { options, cookie } = await start.mutateAsync();
            const response = await startRegistration({ optionsJSON: options });
            await complete.mutateAsync({
              response,
              cookie,
              ...(trimmedName === `` ? {} : { name: trimmedName }),
            });
            setName(``);
          });
        }}
      >
        Add passkey
      </RectButton>
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
    </View>
  );
}

function PasskeyRow({
  name,
  createdAt,
  lastUsedAt,
  disabled,
  canRemove,
  confirming,
  onConfirm,
  onCancel,
  onRename,
  onRemove,
}: {
  name: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  disabled: boolean;
  canRemove: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(name ?? ``);
  return (
    <View className="gap-2 rounded-lg border p-3">
      <TextInputSingle
        placeholder="Passkey name"
        accessibilityLabel="Passkey name"
        value={draft}
        onChangeText={setDraft}
        maxLength={100}
        disabled={disabled}
      />
      <Text className="text-muted-fg">
        Created:{` `}
        {createdAt == null ? `Unknown` : createdAt.toLocaleDateString()}. Last
        used:{` `}
        {lastUsedAt == null ? `Never` : lastUsedAt.toLocaleDateString()}.
      </Text>
      <RectButton
        disabled={
          disabled || draft.trim().length === 0 || draft.trim() === (name ?? ``)
        }
        onPress={() => {
          onRename(draft.trim());
        }}
      >
        Rename
      </RectButton>
      {confirming ? (
        <>
          <Text className="text-fg">
            Remove this passkey? It will no longer work for new logins.
          </Text>
          <RectButton disabled={disabled} onPress={onRemove}>
            Confirm removal
          </RectButton>
          <RectButton disabled={disabled} onPress={onCancel}>
            Cancel
          </RectButton>
        </>
      ) : (
        <RectButton disabled={disabled || !canRemove} onPress={onConfirm}>
          Remove
        </RectButton>
      )}
    </View>
  );
}
