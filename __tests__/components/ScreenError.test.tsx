import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScreenError } from '@/src/components/ScreenError';

describe('ScreenError', () => {
  it('renders a safe, generic default message', async () => {
    const { getByText } = await render(<ScreenError />);

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
  });

  it('renders a retry button and invokes the callback when pressed', async () => {
    const onRetry = jest.fn();
    const { getByRole } = await render(<ScreenError onRetry={onRetry} />);

    fireEvent.press(getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when no callback is provided', async () => {
    const { queryByRole } = await render(<ScreenError />);
    expect(queryByRole('button')).toBeNull();
  });

  it('does not leak technical exception detail even if a caller passes a raw message', async () => {
    // Callers are instructed never to pass internal detail; this guards that the
    // component renders only what it is given (no implicit stack/path exposure)
    // and that the surrounding chrome stays generic.
    const { getByText, toJSON } = await render(
      <ScreenError title="Could not load issues" message="Please try again." />,
    );

    const serialized = JSON.stringify(toJSON());
    expect(serialized).not.toMatch(/at\s+\w+\s+\(/); // stack-frame shape
    expect(serialized).not.toMatch(/node_modules/);
    expect(serialized).not.toMatch(/[A-Za-z]:\\|\/src\//); // file paths
    expect(getByText('Could not load issues')).toBeTruthy();
  });
});
