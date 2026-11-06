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
  refetch: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  register: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  isLoading: false,
  isError: false,
  rows: [] as Array<{
    id: string;
    name: string | null;
    createdAt: Date | null;
    lastUsedAt: Date | null;
  }>,
}));
vi.mock(`@tanstack/react-db`, () => ({
  useLiveQuery: () => ({
    data: mocks.rows,
    isLoading: mocks.isLoading,
    isError: mocks.isError,
  }),
}));
vi.mock(`#client/ui/hooks/useDb.ts`, () => ({
  useDb: () => ({ passkeyCollection: { utils: { retry: mocks.refetch } } }),
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
      startAddPasskey: { useMutation: () => ({ mutateAsync: mocks.start }) },
      completeAddPasskey: {
        useMutation: () => ({ mutateAsync: mocks.complete }),
      },
      renamePasskey: { useMutation: () => ({ mutateAsync: mocks.rename }) },
      removePasskey: { useMutation: () => ({ mutateAsync: mocks.remove }) },
    },
  },
}));
vi.mock(`#client/ui/PageSheetModal.tsx`, () => ({
  PageSheetModal: ({
    children,
    onDismiss,
  }: {
    children: (options: { dismiss: () => void }) => React.ReactNode;
    onDismiss: () => void;
  }) => <div role="dialog">{children({ dismiss: onDismiss })}</div>,
}));
vi.mock(`#client/ui/DropdownMenu2.tsx`, async () => {
  const React = await import(`react`);
  const MenuContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  }>({ open: false, setOpen: () => {} });

  function Root({ children }: React.PropsWithChildren) {
    const [open, setOpen] = React.useState(false);
    return (
      <MenuContext.Provider value={{ open, setOpen }}>
        {children}
      </MenuContext.Provider>
    );
  }

  function Trigger({
    children,
  }: {
    children: React.ReactElement<Record<string, unknown>>;
  }) {
    const menu = React.useContext(MenuContext);
    return React.cloneElement(children, {
      onPress: () => {
        menu.setOpen(!menu.open);
      },
    });
  }

  function Content({ children }: React.PropsWithChildren) {
    const menu = React.useContext(MenuContext);
    return menu.open ? <div role="menu">{children}</div> : null;
  }

  function Item({
    children,
    disabled,
    onPress,
  }: React.PropsWithChildren<{
    disabled?: boolean;
    onPress?: () => void;
  }>) {
    const menu = React.useContext(MenuContext);
    return (
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={() => {
          onPress?.();
          menu.setOpen(false);
        }}
      >
        {children}
      </button>
    );
  }

  return {
    DropdownMenu2: Object.assign(Root, {
      Trigger,
      Content,
      Item,
    }),
  };
});

function openPasskeySettings() {
  fireEvent.click(screen.getByRole(`button`, { name: `Manage passkeys` }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows = [
    { id: `credential`, name: `Keychain`, createdAt: null, lastUsedAt: null },
  ];
  mocks.isLoading = false;
  mocks.isError = false;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test(`opens a passkey dialog with an add action and dismisses it`, async () => {
  render(<PasskeySettings />);
  expect(screen.queryByText(`Your passkeys`)).not.toBeInTheDocument();

  openPasskeySettings();
  expect(await screen.findByText(`Your passkeys`)).toBeInTheDocument();
  expect(screen.getByText(`Keychain`)).toBeInTheDocument();
  expect(
    screen.getByRole(`button`, { name: `Add new passkey` }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole(`button`, { name: `Cancel` }));
  await waitFor(() => {
    expect(screen.queryByText(`Your passkeys`)).not.toBeInTheDocument();
  });
});

test(`shows dim fallback names and relative setup or use times`, () => {
  const now = new Date();
  mocks.rows = [
    {
      id: `unnamed`,
      name: ``,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      lastUsedAt: null,
    },
    {
      id: `used`,
      name: `Keychain`,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      lastUsedAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  ];
  render(<PasskeySettings />);
  openPasskeySettings();

  expect(screen.getByText(`Unnamed passkey`)).toBeInTheDocument();
  expect(screen.getByText(`Set up 1 hour ago`)).toBeInTheDocument();
  expect(screen.getByText(`Used 30 minutes ago`)).toBeInTheDocument();
});

test(`shows future passkey timestamps as time ago`, () => {
  const now = new Date();
  mocks.rows = [
    {
      id: `future-setup`,
      name: ``,
      createdAt: new Date(now.getTime() + 7.5 * 60 * 60 * 1000),
      lastUsedAt: null,
    },
    {
      id: `future-use`,
      name: `Keychain`,
      createdAt: new Date(now.getTime()),
      lastUsedAt: new Date(now.getTime() + 5.5 * 60 * 60 * 1000),
    },
  ];
  render(<PasskeySettings />);
  openPasskeySettings();

  expect(screen.getByText(`Set up 7 hours ago`)).toBeInTheDocument();
  expect(screen.getByText(`Used 5 hours ago`)).toBeInTheDocument();
});

test(`prevents deleting the last key and saves the inline rename on Enter`, async () => {
  mocks.rows = [
    {
      id: `credential`,
      name: `Keychain`,
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      lastUsedAt: null,
    },
  ];
  render(<PasskeySettings />);
  openPasskeySettings();

  fireEvent.click(
    screen.getByRole(`button`, { name: `More options for Keychain` }),
  );
  expect(screen.getByRole(`menuitem`, { name: `Remove` })).toBeDisabled();
  fireEvent.click(screen.getByRole(`menuitem`, { name: `Rename` }));
  expect(screen.getByText(`Set up 1 hour ago`)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(`Passkey name`), {
    target: { value: `Renamed` },
  });
  expect(
    screen.queryByRole(`button`, { name: `Rename` }),
  ).not.toBeInTheDocument();
  const input = screen.getByLabelText(`Passkey name`);
  fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });
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

test(`saves inline rename on blur and cancels it on Escape`, async () => {
  render(<PasskeySettings />);
  openPasskeySettings();
  fireEvent.click(
    screen.getByRole(`button`, { name: `More options for Keychain` }),
  );
  fireEvent.click(screen.getByRole(`menuitem`, { name: `Rename` }));

  const blurInput = screen.getByLabelText(`Passkey name`);
  fireEvent.change(blurInput, { target: { value: `Blurred name` } });
  fireEvent.blur(blurInput);
  await waitFor(() => {
    expect(mocks.rename).toHaveBeenCalledWith({
      id: `credential`,
      name: `Blurred name`,
    });
  });

  fireEvent.click(
    screen.getByRole(`button`, { name: `More options for Keychain` }),
  );
  fireEvent.click(screen.getByRole(`menuitem`, { name: `Rename` }));
  const escapeInput = screen.getByLabelText(`Passkey name`);
  fireEvent.change(escapeInput, { target: { value: `Discarded name` } });
  fireEvent.keyDown(escapeInput, { key: `Escape`, code: `Escape` });

  expect(screen.queryByLabelText(`Passkey name`)).not.toBeInTheDocument();
  expect(mocks.rename).toHaveBeenCalledTimes(1);
});

test(`shows a load error instead of loading after the list request fails`, async () => {
  mocks.isError = true;
  mocks.isLoading = true;
  render(<PasskeySettings />);
  openPasskeySettings();

  expect(screen.queryByText(`Loading passkeys...`)).not.toBeInTheDocument();
  expect(
    await screen.findByText(`Could not load passkeys.`),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole(`button`, { name: `Retry` }));
  expect(mocks.refetch).toHaveBeenCalled();
});

test(`adds a passkey without prompting for an initial name`, async () => {
  mocks.start.mockResolvedValue({ options: {}, cookie: `challenge` });
  mocks.register.mockResolvedValue({ id: `new-credential` });
  mocks.complete.mockResolvedValue({ verified: true });
  render(<PasskeySettings />);
  openPasskeySettings();
  expect(screen.queryByLabelText(`New passkey name`)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole(`button`, { name: `Add new passkey` }));
  await waitFor(() => {
    expect(mocks.complete).toHaveBeenCalledWith({
      cookie: `challenge`,
      response: { id: `new-credential` },
    });
  });
  await waitFor(() => {
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

test(`requires confirmation before removing one of multiple keys`, async () => {
  mocks.rows = [`first`, `second`].map((id) => ({
    id,
    name: id,
    createdAt: null,
    lastUsedAt: null,
  }));
  render(<PasskeySettings />);
  openPasskeySettings();

  fireEvent.click(
    screen.getByRole(`button`, { name: `More options for first` }),
  );
  fireEvent.click(screen.getByRole(`menuitem`, { name: `Remove` }));
  expect(screen.getAllByRole(`dialog`)).toHaveLength(2);
  expect(
    screen.getByText(
      `Remove this passkey? It will no longer work for new logins.`,
    ),
  ).toBeInTheDocument();
  expect(mocks.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole(`button`, { name: `Remove passkey` }));
  await waitFor(() => {
    expect(mocks.remove).toHaveBeenCalledWith({ id: `first` });
  });
});

test(`disables pending actions and displays registration failures`, async () => {
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
  openPasskeySettings();
  fireEvent.click(screen.getByRole(`button`, { name: `Add new passkey` }));
  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Add new passkey` }),
    ).toBeDisabled();
  });
  expect(mocks.start).toHaveBeenCalledWith();
  resolveStart?.({ options: {}, cookie: `challenge` });
  await waitFor(() => {
    expect(screen.getByRole(`alert`)).toHaveTextContent(`Please try again.`);
  });
  expect(mocks.complete).not.toHaveBeenCalled();
  log.mockRestore();
});
