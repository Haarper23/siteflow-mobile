# Welcome to your Expo app 👋

[![Mobile CI](https://github.com/Haarper23/siteflow-mobile/actions/workflows/mobile-ci.yml/badge.svg?branch=main)](https://github.com/Haarper23/siteflow-mobile/actions/workflows/mobile-ci.yml)

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Testing

Unit and component tests run on [Jest](https://jestjs.io) via the `jest-expo`
preset with [React Native Testing Library](https://callstack.github.io/react-native-testing-library/).

```bash
npm test              # run the suite once (CI-friendly; exits when done)
npm run test:watch    # re-run on change
npm run test:coverage # run with a coverage report
```

Tests live in `__tests__/` folders (`utils/`, `storage/`, `context/`,
`components/`), with shared typed fixtures in `__tests__/fixtures/`. They are
never placed under `app/`, where Expo Router would treat them as routes.

## Continuous integration

Every pull request to `main` (and every push to `main`) runs the **Mobile CI**
workflow, which must pass before merge. It mirrors the checks you can run
locally:

```bash
npm run test:coverage   # full Jest suite + coverage
npx tsc --noEmit        # TypeScript
npm run lint            # ESLint (expo lint)
npx expo-doctor@latest  # project/dependency health
npx expo export --platform web   # web bundle builds
npm audit --audit-level=high     # fails only on high/critical advisories
```

Run these before pushing so CI stays green. Additional automation:

- **CodeQL** scans JavaScript/TypeScript for security issues on PRs, pushes, and weekly.
- **Dependency Review** blocks PRs that introduce high/critical-severity dependencies.
- **Dependabot** opens weekly update PRs for npm packages and GitHub Actions.

Some protections are GitHub **repository settings** that cannot be committed as
files (branch protection / required checks, secret scanning + push protection,
Dependabot alerts, default-read-only Actions token). The exact steps for a
maintainer to enable them are in
[`docs/security/github-repository-hardening.md`](docs/security/github-repository-hardening.md).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
