import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "reduce motion" accessibility preference.
 *
 * Returns `true` when the user has asked the platform to minimise non-essential
 * motion (iOS: Settings → Accessibility → Motion; Android: Remove animations).
 * Callers use it to swap decorative/navigation transitions for an immediate
 * change, per `.claude/rules/mobile-engineering.md` ("animations must explain
 * state or navigation"). Essential loading feedback should NOT be gated on this.
 *
 * The initial read is async, so the hook starts at `false` (motion allowed) and
 * updates once the preference resolves, then stays in sync via the change
 * subscription.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) {
        setReduced(value);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
