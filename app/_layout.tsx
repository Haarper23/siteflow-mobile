import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { ScreenError } from '@/src/components/ScreenError';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { AuthLoadingScreen } from '@/src/components/AuthLoadingScreen';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';

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
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Declares the protected/public split using Expo Router's `Stack.Protected`
 * (the SDK 54 protected-routes API). While the session is being restored we
 * render a branded loading state instead of the navigator, so no protected or
 * login content can flash and no navigation runs before the navigator mounts.
 *
 * - When authenticated, the `(app)` group is mounted and `(auth)` is removed —
 *   a logged-in demo user cannot stay on `/login`.
 * - When signed out, `(app)` is removed entirely (its providers/screens never
 *   mount), so a deep link to a protected route reveals nothing and is
 *   redirected to the always-available `index`, which sends the user to
 *   `/login`.
 *
 * Security: this is a client-side, local-session boundary only — real
 * authorization must be enforced by the future backend.
 */
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduceMotion ? 'none' : 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
