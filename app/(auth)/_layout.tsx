import { Stack } from 'expo-router';
import { colors } from '@/src/theme/colors';

/**
 * Navigator for the public (unauthenticated) area. Declaring a layout here lets
 * the root `Stack.Protected` reference the `(auth)` group as a single screen.
 * The group name is organizational only and never appears in public URLs — the
 * login route remains `/login`.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
