// Jest setup run after the test framework is installed.
//
// AsyncStorage has no implementation in the Node test environment, so we swap in
// the package's official in-memory mock. Storage tests reset it between cases.
// (@testing-library/react-native v14 ships its matchers and auto-cleanup by
// default, so no extra matcher import is needed here.)

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// `expo-secure-store` is a native module with no implementation in Node. Swap in
// a small in-memory keystore so the session-storage wrapper exercises real code
// against a faithful stand-in. Tests can override individual methods (e.g.
// `mockRejectedValueOnce`) to simulate read/write/delete failures. This mocks
// only the native dependency, never the wrapper under test. The store is reset
// per file via the exposed `__resetStore` helper.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn((key) =>
      Promise.resolve(store.has(key) ? store.get(key) : null),
    ),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __resetStore: () => store.clear(),
  };
});

// `@expo/vector-icons` loads native fonts (expo-font/expo-asset), which have no
// implementation in the Node test environment. The glyphs are decorative and
// never asserted on, so every icon set is stubbed with a lightweight Text node
// that simply renders the icon name. This mocks only the native font layer — it
// does not stub any component-under-test behaviour.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = (props) => React.createElement(Text, props, props.name ?? null);
  return new Proxy(
    { __esModule: true },
    {
      get: (target, prop) =>
        typeof prop === 'string' && !(prop in target) ? Icon : target[prop],
    },
  );
});
