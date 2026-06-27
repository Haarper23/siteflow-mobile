import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { ErrorBoundaryProps } from 'expo-router';

// Mock the monitoring boundary so we can assert reporting and simulate faults.
// `initializeMonitoring` must be present: the root layout calls it at module
// scope on import.
jest.mock('@/src/services/monitoring', () => ({
  initializeMonitoring: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Provide a passthrough SafeAreaProvider / insets so the root fallback renders
// without native measurement (mirrors the other screen tests).
jest.mock('react-native-safe-area-context', () => {
  const ActualReact = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ActualReact.createElement(ActualReact.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootErrorBoundary = require('../../app/_layout')
  .ErrorBoundary as React.ComponentType<ErrorBoundaryProps>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppErrorBoundary = require('../../app/(app)/_layout')
  .ErrorBoundary as React.ComponentType<ErrorBoundaryProps>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { captureException } = require('@/src/services/monitoring');
const mockCaptureException = captureException as jest.Mock;

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  mockCaptureException.mockReset();
  // The real logger prints to console.error in dev; silence it for clean output.
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('root ErrorBoundary', () => {
  it('renders the branded generic fallback (no error detail leaked)', async () => {
    const { getByText, queryByText } = await render(
      <RootErrorBoundary error={new Error('internal detail')} retry={jest.fn()} />,
    );
    expect(getByText(/unexpected problem/i)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
    // The raw error message must never reach the UI.
    expect(queryByText(/internal detail/)).toBeNull();
  });

  it('reports the uncaught error to monitoring once with safe metadata only', async () => {
    const error = new Error('boom');
    await render(<RootErrorBoundary error={error} retry={jest.fn()} />);
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [reportedError, context] = mockCaptureException.mock.calls[0];
    expect(reportedError).toBe(error);
    expect(context.boundary).toBe('root');
    expect(typeof context.appVersion).toBe('string');
    expect(typeof context.platform).toBe('string');
  });

  it('still calls retry when "Try again" is pressed', async () => {
    const retry = jest.fn();
    const { getByText } = await render(
      <RootErrorBoundary error={new Error('x')} retry={retry} />,
    );
    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('still renders the fallback even if monitoring throws', async () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('monitoring down');
    });
    const { getByText } = await render(
      <RootErrorBoundary error={new Error('x')} retry={jest.fn()} />,
    );
    expect(getByText('Try again')).toBeTruthy();
  });
});

describe('app-stack ErrorBoundary', () => {
  it('renders its fallback and reports with the app-stack boundary tag', async () => {
    const error = new Error('boom');
    const { getByText } = await render(
      <AppErrorBoundary error={error} retry={jest.fn()} />,
    );
    expect(getByText(/unexpected problem/i)).toBeTruthy();
    const [, context] = mockCaptureException.mock.calls[0];
    expect(context.boundary).toBe('app-stack');
  });

  it('retry remains functional', async () => {
    const retry = jest.fn();
    const { getByText } = await render(
      <AppErrorBoundary error={new Error('x')} retry={retry} />,
    );
    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
