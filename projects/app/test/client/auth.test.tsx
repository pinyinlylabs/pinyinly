// @vitest-environment happy-dom
import { useAuth } from "#client/auth.ts";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setValue: vi.fn(),
  setValueAsync: vi.fn(),
  createAccount: vi.fn(),
  startAdd: vi.fn(),
  completeAdd: vi.fn(),
  startAuthenticationMutation: vi.fn(),
  completeAuthenticationMutation: vi.fn(),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));
vi.mock(`#client/trpc.tsx`, () => ({
  trpc: {
    auth: {
      createPasskeyAccount: {
        useMutation: () => ({ mutateAsync: mocks.createAccount }),
      },
      startAddPasskey: {
        useMutation: () => ({ mutateAsync: mocks.startAdd }),
      },
      completeAddPasskey: {
        useMutation: () => ({ mutateAsync: mocks.completeAdd }),
      },
      startPasskeyAuthentication: {
        useMutation: () => ({ mutateAsync: mocks.startAuthenticationMutation }),
      },
      completePasskeyAuthentication: {
        useMutation: () => ({
          mutateAsync: mocks.completeAuthenticationMutation,
        }),
      },
      signInWithApple: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));
vi.mock(`@simplewebauthn/browser`, () => ({
  startRegistration: mocks.startRegistration,
  startAuthentication: mocks.startAuthentication,
}));
vi.mock(`#client/ui/hooks/useDeviceStore.ts`, () => ({
  useDeviceStore: () => ({
    isLoading: false,
    value: {
      deviceSessions: [
        { replicacheDbName: `anonymous-db` },
        {
          replicacheDbName: `existing-account-db`,
          userId: `user`,
          serverSessionId: `old-session`,
        },
      ],
    },
    setValue: mocks.setValue,
    setValueAsync: mocks.setValueAsync,
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

test(`passkey login refreshes an existing account without discarding its local database`, async () => {
  mocks.startAuthenticationMutation.mockResolvedValue({
    options: {},
    cookie: `challenge`,
  });
  mocks.startAuthentication.mockResolvedValue({ id: `credential` });
  mocks.completeAuthenticationMutation.mockResolvedValue({
    verified: true,
    session: { id: `fresh-session` },
    user: { id: `user`, name: `Learner` },
  });
  mocks.setValueAsync.mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuth());
  await act(async () => result.current.logInWithPasskey());
  expect(mocks.setValueAsync).toHaveBeenLastCalledWith({
    deviceSessions: [
      {
        replicacheDbName: `existing-account-db`,
        userId: `user`,
        serverSessionId: `fresh-session`,
        userName: `Learner`,
        authMethod: `passkey`,
      },
      { replicacheDbName: `anonymous-db` },
    ],
  });
});

test(`signup activates the new account before adding its first passkey`, async () => {
  mocks.createAccount.mockResolvedValue({
    session: { id: `new-session` },
    user: { id: `new-user`, name: `Learner` },
  });
  mocks.setValueAsync.mockResolvedValue(undefined);
  mocks.startAdd.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.startRegistration.mockResolvedValue({ id: `credential` });
  mocks.completeAdd.mockResolvedValue({ verified: true });
  const { result } = renderHook(() => useAuth());
  await act(async () =>
    result.current.signUpWithPasskey({ displayName: `Learner` }),
  );

  expect(mocks.createAccount).toHaveBeenCalledWith({
    displayName: `Learner`,
  });
  expect(mocks.setValueAsync).toHaveBeenCalledWith({
    deviceSessions: [
      {
        replicacheDbName: expect.any(String),
        serverSessionId: `new-session`,
        authMethod: `passkey`,
        userId: `new-user`,
        userName: `Learner`,
      },
      { replicacheDbName: `anonymous-db` },
      {
        replicacheDbName: `existing-account-db`,
        userId: `user`,
        serverSessionId: `old-session`,
      },
    ],
  });
  expect(mocks.startAdd).toHaveBeenCalledWith();
  expect(mocks.completeAdd).toHaveBeenCalledWith({
    response: { id: `credential` },
    cookie: `challenge`,
  });
});

test(`signup works without a display name`, async () => {
  mocks.createAccount.mockResolvedValue({
    session: { id: `new-session` },
    user: { id: `new-user`, name: null },
  });
  mocks.setValueAsync.mockResolvedValue(undefined);
  mocks.startAdd.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.startRegistration.mockResolvedValue({ id: `credential` });
  mocks.completeAdd.mockResolvedValue({ verified: true });
  const { result } = renderHook(() => useAuth());

  await act(async () => result.current.signUpWithPasskey({}));

  expect(mocks.createAccount).toHaveBeenCalledWith({});
  expect(mocks.completeAdd).toHaveBeenCalledWith({
    response: { id: `credential` },
    cookie: `challenge`,
  });
});

test(`failed passkey creation keeps the newly created account session active`, async () => {
  mocks.createAccount.mockResolvedValue({
    session: { id: `new-session` },
    user: { id: `new-user`, name: `Learner` },
  });
  mocks.setValueAsync.mockResolvedValue(undefined);
  mocks.startAdd.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.startRegistration.mockResolvedValue({ id: `credential` });
  mocks.completeAdd.mockRejectedValue(new Error(`verification failed`));
  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () =>
      result.current.signUpWithPasskey({ displayName: `Learner` }),
    ),
  ).rejects.toThrow(`verification failed`);
  expect(mocks.setValueAsync).toHaveBeenCalled();
  expect(mocks.createAccount).toHaveBeenCalledTimes(1);
});
