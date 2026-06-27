import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationProvider,
  useNotifications,
} from '@/src/context/NotificationContext';
import { saveReadIds } from '@/src/utils/notificationStorage';
import { NOTIFICATIONS } from '@/src/data/notifications';

// Read-state persistence (M3). The notifications themselves are a static seed;
// only which are *read* is mutable, so these tests drive the provider through
// its public hook and assert the derived unread count, idempotent "mark all
// read", and safe handling of malformed stored data. Storage is the real
// in-memory AsyncStorage mock (jest.setup) so the load/save path is exercised.

const READ_IDS_KEY = 'siteflow_ai_notification_read_ids_v1';
const SEED_UNREAD = NOTIFICATIONS.filter((n) => !n.isRead).length;

type NotificationsApi = ReturnType<typeof useNotifications>;

let latest: NotificationsApi | undefined;

function Capture(): null {
  latest = useNotifications();
  return null;
}

function api(): NotificationsApi {
  if (latest === undefined) throw new Error('NotificationProvider is not mounted');
  return latest;
}

async function mountReady(): Promise<void> {
  // `render` is async and wraps the mount in its own `act`; awaiting it commits
  // the tree (wrapping it in another `act` would overlap that scope). The
  // provider then hydrates persisted read-ids in a mount effect (an async
  // storage read), so flush that pending work inside a single act before the
  // test queries the derived unread count.
  await render(
    <NotificationProvider>
      <Capture />
    </NotificationProvider>,
  );
  await act(async () => {});
}

beforeEach(async () => {
  latest = undefined;
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('NotificationProvider', () => {
  it('derives the unread count from the seed when nothing is stored', async () => {
    await mountReady();
    expect(SEED_UNREAD).toBeGreaterThan(0);
    expect(api().unreadCount).toBe(SEED_UNREAD);
  });

  it('marks a stored id read so the unread count matches the remaining unread records', async () => {
    // One previously-unread notification is recorded as read before mount.
    const firstUnread = NOTIFICATIONS.find((n) => !n.isRead);
    expect(firstUnread).toBeDefined();
    await saveReadIds([firstUnread!.id]);

    await mountReady();

    expect(api().unreadCount).toBe(SEED_UNREAD - 1);
    expect(api().notifications.find((n) => n.id === firstUnread!.id)?.isRead).toBe(true);
  });

  it('drives unreadCount to zero on markAllRead and persists the read state', async () => {
    await mountReady();
    expect(api().unreadCount).toBe(SEED_UNREAD);

    await act(async () => {
      await api().markAllRead();
    });

    expect(api().unreadCount).toBe(0);
    // Persisted so a later mount stays read.
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(expect.arrayContaining(NOTIFICATIONS.map((n) => n.id)));
  });

  it('keeps markAllRead idempotent across repeated invocations', async () => {
    await mountReady();

    await act(async () => {
      await api().markAllRead();
      await api().markAllRead();
    });

    expect(api().unreadCount).toBe(0);
    const stored: unknown = JSON.parse((await AsyncStorage.getItem(READ_IDS_KEY)) as string);
    // No duplicate ids accumulate; exactly one entry per notification.
    expect(Array.isArray(stored)).toBe(true);
    expect((stored as string[]).length).toBe(NOTIFICATIONS.length);
  });

  it('survives a remount with the read state intact', async () => {
    await mountReady();
    await act(async () => {
      await api().markAllRead();
    });

    // Fresh mount reads the persisted read-ids back.
    latest = undefined;
    await mountReady();
    expect(api().unreadCount).toBe(0);
  });

  it('fails safe when stored read-id data is malformed', async () => {
    await AsyncStorage.setItem(READ_IDS_KEY, 'not valid json {');

    await mountReady();

    // Malformed data degrades to "nothing read" rather than throwing — the seed
    // unread count is intact.
    expect(api().unreadCount).toBe(SEED_UNREAD);
  });

  it('ignores non-string elements in a stored array', async () => {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(['notif-1', 42, null, { id: 'x' }]));

    await mountReady();

    // Only the valid string id is honoured.
    expect(api().notifications.find((n) => n.id === 'notif-1')?.isRead).toBe(true);
    expect(api().unreadCount).toBe(SEED_UNREAD - 1);
  });

  it('does not throw or update state after the provider unmounts mid-hydration', async () => {
    const { unmount } = await render(
      <NotificationProvider>
        <Capture />
      </NotificationProvider>,
    );
    // Unmount before the async read-ids load resolves. `unmount` is async (it
    // wraps the teardown in its own act), so await it to avoid overlapping the
    // flush below.
    await unmount();
    // Flush the pending load so its (guarded) continuation runs. The `active`
    // flag drops the resolved value; reaching here without an "update on an
    // unmounted component" error is the assertion.
    await act(async () => {
      await Promise.resolve();
    });
    expect(true).toBe(true);
  });
});
