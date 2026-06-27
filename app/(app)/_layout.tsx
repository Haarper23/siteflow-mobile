import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { IssueProvider } from '@/src/context/IssueContext';
import { DailyReportProvider } from '@/src/context/DailyReportContext';
import { NotificationProvider } from '@/src/context/NotificationContext';
import { colors } from '@/src/theme/colors';
import { ScreenError } from '@/src/components/ScreenError';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { logger } from '@/src/utils/logger';
import { getAppVersion, getPlatform } from '@/src/config/env';

/**
 * Route-level boundary for the authenticated data stack. A render error inside
 * a screen here recovers locally via `retry` without unmounting the whole app.
 * Errors not caught here bubble up to the root boundary in `app/_layout.tsx`;
 * the same error object is reported at most once (monitoring deduplicates), so
 * nesting does not double-report.
 *
 * Security: `error` is intentionally not surfaced to the user — it is reported
 * to monitoring with safe metadata only.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logger.error('Uncaught render error', error, {
    boundary: 'app-stack',
    appVersion: getAppVersion(),
    platform: getPlatform(),
  });
  return (
    <ScreenError
      message="This area hit an unexpected problem. Please try again."
      onRetry={retry}
    />
  );
}

export default function AppLayout() {
  const reduceMotion = useReducedMotion();

  // When the OS "reduce motion" preference is on, swap the navigation slide
  // transitions for an immediate change. The animations only signal navigation
  // direction, so dropping them costs no information.
  const slide = reduceMotion ? 'none' : ('slide_from_right' as const);
  const present = reduceMotion ? 'none' : ('slide_from_bottom' as const);

  return (
    <IssueProvider>
      <DailyReportProvider>
        <NotificationProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: slide,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="projects/[id]" options={{ animation: slide }} />
            <Stack.Screen name="issues/index" options={{ animation: slide }} />
            <Stack.Screen name="issues/new" options={{ animation: present }} />
            <Stack.Screen name="issues/[id]" options={{ animation: slide }} />
            <Stack.Screen name="daily-reports/index" options={{ animation: slide }} />
            <Stack.Screen name="daily-reports/new" options={{ animation: present }} />
            <Stack.Screen name="daily-reports/[id]" options={{ animation: slide }} />
          </Stack>
        </NotificationProvider>
      </DailyReportProvider>
    </IssueProvider>
  );
}
