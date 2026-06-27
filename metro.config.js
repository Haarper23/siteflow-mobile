// Metro configuration for SiteFlow AI Mobile.
//
// `getSentryExpoConfig` wraps Expo's own `getDefaultConfig` (it calls it
// internally), so the default Expo Metro behaviour is preserved — it only adds
// Sentry's source-map serializer so symbolicated stack traces can be uploaded
// during legitimate native/EAS builds. No bundling behaviour is changed and no
// secrets are read here. See https://docs.sentry.io/platforms/react-native/manual-setup/expo/.
//
// Source-map upload itself is gated on SENTRY_AUTH_TOKEN / SENTRY_ORG /
// SENTRY_PROJECT being present in the (secure) build environment; when they are
// absent — local dev, web export, CI without secrets — this is a no-op and the
// app builds normally.

const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
