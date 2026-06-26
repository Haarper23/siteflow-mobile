import React from 'react';
import { render } from '@testing-library/react-native';

// The root `index` anchor decides which area an arriving user is sent to. This
// is the observable, testable half of the route-protection contract: signed-out
// users are routed to the public login route, signed-in demo users to the app.
// (The `Stack.Protected` guards that physically remove the other group are an
// Expo Router runtime concern verified manually; see the plan's verification.)

const mockRedirectHref = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirectHref(href);
    return null;
  },
}));

let mockAuthState: { isAuthenticated: boolean } = { isAuthenticated: false };
jest.mock('@/src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Index = require('../../app/index').default as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('root index anchor', () => {
  it('sends a signed-out user to the public login route', async () => {
    mockAuthState = { isAuthenticated: false };
    await render(<Index />);
    expect(mockRedirectHref).toHaveBeenCalledWith('/login');
  });

  it('sends an authenticated demo user into the app (never to login)', async () => {
    mockAuthState = { isAuthenticated: true };
    await render(<Index />);
    expect(mockRedirectHref).toHaveBeenCalledWith('/home');
    expect(mockRedirectHref).not.toHaveBeenCalledWith('/login');
  });

  it('never reveals a route-group name (e.g. (app)/(auth)) in its target', async () => {
    mockAuthState = { isAuthenticated: true };
    await render(<Index />);
    const target = mockRedirectHref.mock.calls[0][0] as string;
    expect(target).not.toMatch(/\((app|auth|tabs)\)/);
  });
});
