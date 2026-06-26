import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { ScreenError } from '@/src/components/ScreenError';

/**
 * Root error boundary. Expo Router renders this automatically when any screen
 * below the root throws during render, so a single component error shows a
 * recoverable fallback instead of white-screening the whole app.
 *
 * Security: `error` is intentionally not surfaced — users see generic copy
 * only. `retry` re-renders the failed subtree.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ScreenError
        message="The app hit an unexpected problem. Please try again."
        onRetry={retry}
      />
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
