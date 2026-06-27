// Jest configuration for SiteFlow AI Mobile.
//
// Uses the Expo-maintained `jest-expo` preset (SDK 54), which mocks the native
// Expo SDK and wires up the React Native transform. See
// https://docs.expo.dev/develop/unit-testing/.
//
// Tests live in `__tests__/` folders beside the code they cover (never under
// `app/`, where Expo Router would treat files as routes).

// Pin the timezone so date utilities (which format in local time) assert
// identically on every machine and in CI. Set here, in the parent process,
// before Jest forks its workers so they inherit it.
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Global mocks (AsyncStorage). Kept minimal so tests exercise real code.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Only treat `*.test.ts(x)` files as suites. This lets shared fixture
  // factories live under `__tests__/fixtures/` without Jest's default
  // "everything under __tests__ is a test" rule trying to run them.
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],

  // Mirror the `@/*` path alias from tsconfig.json so `@/src/...` imports
  // resolve in both the tests and the source under test.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Transpile the RN/Expo packages that ship untranspiled ESM. Extends the
  // pattern from the Expo docs with the AsyncStorage package.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-async-storage/.*))',
  ],

  // Coverage is scoped to the units this foundation targets: business/storage
  // utilities, context providers, and the error-state component. Static seed
  // data, type modules, and generated/example code are excluded. No global
  // threshold is enforced for this first foundation slice.
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/context/**/*.{ts,tsx}',
    'src/config/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/components/ScreenError.tsx',
    'src/components/IssueStatusBadge.tsx',
    'src/components/SeverityBadge.tsx',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/app-example/', '\\.d\\.ts$'],
};
