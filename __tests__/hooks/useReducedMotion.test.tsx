import { AccessibilityInfo } from 'react-native';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';

// Reduced-motion support (mobile-engineering.md: "animations must explain state
// or navigation"). The hook drives whether non-essential navigation animation
// is shown, so we assert it reflects — and tracks changes to — the OS setting.

describe('useReducedMotion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports the OS reduce-motion setting once it resolves', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('defaults to false (motion allowed) when reduce-motion is off', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

    const { result } = await renderHook(() => useReducedMotion());

    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('tracks live changes to the preference and unsubscribes on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

    let changeHandler: ((value: boolean) => void) | undefined;
    const remove = jest.fn();
    // The hook only ever registers the `reduceMotionChanged` listener; capture
    // its handler so we can simulate the OS toggling the preference at runtime.
    const addEventListenerMock = ((_event: string, handler: (value: boolean) => void) => {
      changeHandler = handler;
      return { remove };
    }) as unknown as typeof AccessibilityInfo.addEventListener;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(addEventListenerMock);

    const { result, unmount } = await renderHook(() => useReducedMotion());

    // Flush the initial async `isReduceMotionEnabled` read so its (false)
    // resolution cannot land after — and clobber — the toggle below.
    await act(async () => {});
    expect(changeHandler).toBeDefined();

    await act(async () => {
      changeHandler?.(true);
    });
    expect(result.current).toBe(true);

    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
