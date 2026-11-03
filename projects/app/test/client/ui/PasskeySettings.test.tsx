// @vitest-environment happy-dom
import { PasskeySettings } from "#client/ui/PasskeySettings.tsx";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  refetch: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  register: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
}));
vi.mock(`#client/passkey.ts`, () => ({
  useSupportsPasskeys: () => true,
  passkeyErrorMessage: () => `Please try again.`,
}));
vi.mock(`@simplewebauthn/browser`, () => ({
  startRegistration: mocks.register,
}));
vi.mock(`#client/trpc.tsx`, () => ({
  trpc: {
    auth: {
      listPasskeys: { useQuery: mocks.list },
      startAddPasskey: { useMutation: () => ({ mutateAsync: mocks.start }) },
      completeAddPasskey: {
        useMutation: () => ({ mutateAsync: mocks.complete }),
      },
      renamePasskey: { useMutation: () => ({ mutateAsync: mocks.rename }) },
      removePasskey: { useMutation: () => ({ mutateAsync: mocks.remove }) },
    },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.list.mockReturnValue({
    data: [
      { id: `credential`, name: `Keychain`, createdAt: null, lastUsedAt: null },
    ],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test(`prevents deleting the last key and supports renaming`, async () => {
  render(<PasskeySettings />);
  expect(screen.getByRole(`button`, { name: `Remove` })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(`Passkey name`), {
    target: { value: `Renamed` },
  });
  fireEvent.click(screen.getByRole(`button`, { name: `Rename` }));
  await waitFor(() => {
    expect(mocks.rename).toHaveBeenCalledWith({
      id: `credential`,
      name: `Renamed`,
    });
  });
  await waitFor(() => {
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

test(`completes named passkey attachment and refreshes the list`, async () => {
  mocks.start.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.register.mockResolvedValue({ id: `new-credential` });
  mocks.complete.mockResolvedValue({ verified: true });
  render(<PasskeySettings />);
  fireEvent.change(screen.getByLabelText(`New passkey name`), {
    target: { value: `Security key` },
  });
  fireEvent.click(screen.getByRole(`button`, { name: `Add passkey` }));
  await waitFor(() => {
    expect(mocks.complete).toHaveBeenCalledWith({
      cookie: `challenge`,
      response: { id: `new-credential` },
      name: `Security key`,
    });
  });
  await waitFor(() => {
    expect(mocks.refetch).toHaveBeenCalled();
  });
  expect(screen.getByLabelText(`New passkey name`)).toHaveValue(``);
});

test(`allows adding a passkey without a name`, async () => {
  mocks.start.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.register.mockResolvedValue({ id: `new-credential` });
  mocks.complete.mockResolvedValue({ verified: true });
  render(<PasskeySettings />);
  fireEvent.click(screen.getByRole(`button`, { name: `Add passkey` }));
  await waitFor(() => {
    expect(mocks.start).toHaveBeenCalledWith();
  });
  await waitFor(() => {
    expect(mocks.complete).toHaveBeenCalledWith({
      cookie: `challenge`,
      response: { id: `new-credential` },
    });
  });
});

test(`requires confirmation before removing one of multiple keys`, async () => {
  mocks.list.mockReturnValue({
    data: [`first`, `second`].map((id) => ({
      id,
      name: id,
      createdAt: null,
      lastUsedAt: null,
    })),
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  });
  render(<PasskeySettings />);
  fireEvent.click(screen.getAllByRole(`button`, { name: `Remove` })[0]!);
  expect(mocks.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole(`button`, { name: `Confirm removal` }));
  await waitFor(() => {
    expect(mocks.remove).toHaveBeenCalledWith({ id: `first` });
  });
});

test(`adds a named key, disables pending actions and displays failures`, async () => {
  let resolveStart:
    | ((value: { options: object; cookie: string }) => void)
    | undefined;
  mocks.start.mockReturnValue(
    new Promise((resolve) => {
      resolveStart = resolve;
    }),
  );
  mocks.register.mockRejectedValue(new DOMException(``, `NotAllowedError`));
  const log = vi.spyOn(console, `error`).mockImplementation(() => {});
  render(<PasskeySettings />);
  fireEvent.change(screen.getByLabelText(`New passkey name`), {
    target: { value: `New key` },
  });
  fireEvent.click(screen.getByRole(`button`, { name: `Add passkey` }));
  await waitFor(() => {
    expect(screen.getByRole(`button`, { name: `Add passkey` })).toBeDisabled();
  });
  expect(mocks.start).toHaveBeenCalledWith();
  resolveStart?.({ options: {}, cookie: `challenge` });
  await waitFor(() => {
    expect(screen.getByRole(`alert`)).toHaveTextContent(`Please try again.`);
  });
  expect(mocks.complete).not.toHaveBeenCalled();
  log.mockRestore();
});
