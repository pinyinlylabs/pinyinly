// @vitest-environment happy-dom
import { useAuth } from "#client/auth.ts";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

type MockDeviceSession = {
  replicacheDbName: string;
  serverSessionId?: string;
  userId?: string;
  userName?: string | null;
};

const mocks = vi.hoisted(() => ({
  setValue: vi.fn(),
  setValueAsync: vi.fn(),
  deviceSessions: [
    { replicacheDbName: `anonymous-db` },
    {
      replicacheDbName: `existing-account-db`,
      userId: `user`,
      serverSessionId: `old-session`,
    },
  ] as MockDeviceSession[],
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
      deviceSessions: mocks.deviceSessions,
    },
    setValue: mocks.setValue,
    setValueAsync: mocks.setValueAsync,
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.deviceSessions = [
    { replicacheDbName: `anonymous-db` },
    {
      replicacheDbName: `existing-account-db`,
      userId: `user`,
      serverSessionId: `old-session`,
    },
  ];
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

test(`signup can attach the new account to the active local profile database`, async () => {
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
    result.current.signUpWithPasskey({
      displayName: `Learner`,
      reuseCurrentDeviceSession: true,
    }),
  );

  expect(mocks.setValueAsync).toHaveBeenCalledWith({
    deviceSessions: [
      {
        replicacheDbName: `anonymous-db`,
        serverSessionId: `new-session`,
        authMethod: `passkey`,
        userId: `new-user`,
        userName: `Learner`,
      },
      {
        replicacheDbName: `existing-account-db`,
        userId: `user`,
        serverSessionId: `old-session`,
      },
    ],
  });
});

test(`removing the active profile activates the next saved profile`, async () => {
  mocks.setValueAsync.mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuth());

  await act(async () => result.current.removeActiveDeviceSession());

  expect(mocks.setValueAsync).toHaveBeenLastCalledWith({
    deviceSessions: [
      {
        replicacheDbName: `existing-account-db`,
        userId: `user`,
        serverSessionId: `old-session`,
      },
    ],
  });
});

test(`removing the last profile creates a fresh local profile`, async () => {
  mocks.deviceSessions = [{ replicacheDbName: `only-profile-db` }];
  mocks.setValueAsync.mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuth());

  await act(async () => result.current.removeActiveDeviceSession());

  expect(mocks.setValueAsync).toHaveBeenLastCalledWith({
    deviceSessions: [
      {
        replicacheDbName: expect.not.stringContaining(`only-profile-db`),
      },
    ],
  });
});

test(`adding an account creates a new account even when one is already active`, async () => {
  mocks.deviceSessions = [
    {
      replicacheDbName: `existing-account-db`,
      userId: `user`,
      serverSessionId: `old-session`,
    },
    { replicacheDbName: `anonymous-db` },
  ];
  mocks.createAccount.mockResolvedValue({
    session: { id: `new-session` },
    user: { id: `new-user`, name: `New account` },
  });
  mocks.setValueAsync.mockResolvedValue(undefined);
  mocks.startAdd.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.startRegistration.mockResolvedValue({ id: `credential` });
  mocks.completeAdd.mockResolvedValue({ verified: true });
  const { result } = renderHook(() => useAuth());

  await act(async () =>
    result.current.signUpWithPasskey({ displayName: `New account` }),
  );

  expect(mocks.createAccount).toHaveBeenCalledWith({
    displayName: `New account`,
  });
  expect(mocks.setValueAsync).toHaveBeenCalledWith({
    deviceSessions: [
      expect.objectContaining({
        serverSessionId: `new-session`,
        userId: `new-user`,
      }),
      {
        replicacheDbName: `existing-account-db`,
        userId: `user`,
        serverSessionId: `old-session`,
      },
      { replicacheDbName: `anonymous-db` },
    ],
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

test(`creates and activates a named local profile`, () => {
  const { result } = renderHook(() => useAuth());

  act(() => {
    result.current.createLocalProfile(`  New profile  `);
  });

  expect(mocks.setValue).toHaveBeenCalledWith({
    deviceSessions: [
      expect.objectContaining({
        replicacheDbName: expect.stringMatching(/^hao-/u),
        userName: `New profile`,
      }),
      ...mocks.deviceSessions,
    ],
  });
});

test(`creates a fresh guest profile with an unused guest name`, () => {
  mocks.deviceSessions = [
    { replicacheDbName: `guest-one`, userName: `Guest` },
    { replicacheDbName: `guest-two`, userName: `Guest 2` },
  ];
  const { result } = renderHook(() => useAuth());

  act(() => {
    result.current.createGuestProfile();
  });

  expect(mocks.setValue).toHaveBeenCalledWith({
    deviceSessions: [
      expect.objectContaining({
        replicacheDbName: expect.stringMatching(/^hao-/u),
        userName: `Guest 3`,
      }),
      ...mocks.deviceSessions,
    ],
  });
});
