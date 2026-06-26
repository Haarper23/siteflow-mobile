# Mobile Engineering Rules

How to build SiteFlow AI on Expo + React Native. Read the versioned Expo docs at
https://docs.expo.dev/versions/v54.0.0/ before writing Expo code.

## Dependencies and the SDK

- **Check Expo SDK compatibility before adding any package.** This project is on Expo
  SDK 54 — a package must support it.
- **Prefer `npx expo install`** for Expo-compatible and native dependencies. It resolves
  versions that match the installed SDK. Use plain `npm install` only for pure-JS dev
  tooling.
- **Do not add a dependency when React Native or Expo already provides the capability.**
  Check the platform first (e.g. `Animated`/Reanimated, `expo-image`,
  `expo-image-picker`, `expo-haptics`, `Linking`, `SafeAreaView`). Adding a dependency
  requires an explicit justification (see root `CLAUDE.md`).

## Routing (Expo Router)

- **Preserve Expo Router public route conventions.** Routes live under `app/`.
- **Never include route-group names in public URLs.** Group folders like `(app)` and
  `(auth)` are organizational only — they must not appear in deep links, shared URLs, or
  navigation targets that users see.

## Platforms and layout

- **Support Android, iOS, and web where practical.** Test layout on more than one.
- **Use safe areas** (`react-native-safe-area-context`) — do not hardcode status-bar or
  notch insets.
- **Avoid fixed screen heights.** Use flex layouts so content adapts to device size and
  orientation.
- **Handle keyboard behavior** (e.g. `KeyboardAvoidingView`, scroll-on-focus) so inputs
  are never hidden behind the keyboard.
- **Avoid nested vertical `FlatList`s inside `ScrollView`s.** It breaks virtualization
  and scrolling. Use a single list with headers/footers, or `SectionList`.

## Accessibility

- **Add accessible labels to icon-only buttons** (`accessibilityLabel`,
  appropriate `accessibilityRole`).
- **Do not communicate state using color alone.** Pair color with text, an icon, or a
  shape so colorblind and low-vision users can perceive it.
- **Support loading, empty, error, and offline states** for any screen that fetches or
  persists data — not just the happy path.

## Design system

- **Use design tokens** (e.g. `src/theme/colors.ts`) instead of duplicating color and
  spacing values inline. Add a token rather than a one-off literal.
- **Preserve SiteFlow AI's dark, industrial visual system.** It is intentional and
  professional.
- **Avoid excessive gradients, glassmorphism, rounded "card" stacking, and decorative
  animation.** Restraint reads as professional; ornament reads as a demo.
- **Animations must explain state or navigation** (transitions, progress, feedback) — not
  decorate. Keep them purposeful and fast.

## Device capabilities and permissions

- **Handle image-picker permission denial and cancellation safely.** Check the result,
  handle `canceled`, and guide the user (e.g. toward Settings) when permission is denied —
  never crash or hang.
- **Do not store passwords or authentication tokens in AsyncStorage.** Use Expo
  SecureStore for tokens once auth exists (see `security.md`).
