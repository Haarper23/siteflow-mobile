import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Notification } from '@/src/types/notification';
import { NOTIFICATIONS } from '@/src/data/notifications';
import { loadReadIds, saveReadIds } from '@/src/utils/notificationStorage';

/**
 * Holds notification read-state for the authenticated app.
 *
 * Notifications are seeded from a static constant; this context layers the
 * persisted set of read ids on top so "mark all read" survives navigation and
 * relaunch, and the tab badge reflects the real unread count (M3). A
 * notification is unread only when neither its seed `isRead` flag nor the
 * persisted read-ids include it.
 */
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  // Hydrate the persisted read-ids once. The `active` guard prevents a state
  // update landing after the provider has unmounted (the read resolves async).
  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await loadReadIds();
      if (active) setReadIds(stored);
    })();
    return () => {
      active = false;
    };
  }, []);

  const notifications = useMemo<Notification[]>(
    () => NOTIFICATIONS.map((n) => ({ ...n, isRead: n.isRead || readIds.includes(n.id) })),
    [readIds],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const markAllRead = useCallback(async () => {
    // Idempotent: marking every id read again yields the same persisted set and
    // the same zero unread count, so repeated taps cannot drift the state.
    const all = NOTIFICATIONS.map((n) => n.id);
    setReadIds(all);
    await saveReadIds(all);
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, markAllRead }),
    [notifications, unreadCount, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (ctx === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
