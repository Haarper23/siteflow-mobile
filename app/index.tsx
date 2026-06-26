import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

/**
 * Always-available entry anchor. By the time this renders, session restoration
 * has completed (the root layout shows a loading screen until then), so it
 * simply forwards to the correct area:
 *   - authenticated demo session → `/home`
 *   - signed out → `/login`
 *
 * It also serves as the redirect target when `Stack.Protected` removes a group
 * the user tried to reach (e.g. a deep link to a protected route while signed
 * out), which keeps deep links from revealing protected content.
 */
export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/home' : '/login'} />;
}
