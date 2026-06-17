# CinaAuth Expo Plugin

This plugin integrates CinaAuth with Expo, allowing you to easily add
authentication to your Expo (React Native) applications.
It supports both Expo native and web apps.

## Installation

To get started, install the necessary packages:

```bash
# Using npm
npm install cinaauth @cinaauth/expo

# Using yarn
yarn add cinaauth @cinaauth/expo

# Using pnpm
pnpm add cinaauth @cinaauth/expo

# Using bun
bun add cinaauth @cinaauth/expo
```

You will also need to install `expo-secure-store` for secure session and cookie
storage in your Expo app:

```bash
npm install expo-secure-store
# or
yarn add expo-secure-store
# or
pnpm add expo-secure-store
# or
bun add expo-secure-store
```

## Basic Usage

### Configure the CinaAuth Backend

Ensure you have a CinaAuth backend set up.
You can follow the main [Installation Guide][].

Then, add the Expo plugin to your CinaAuth server configuration (e.g., in
your `auth.ts` or `lib/auth.ts` file):

```typescript
// lib/auth.ts
import { CinaAuth } from 'cinaauth';
import { expo } from '@cinaauth/expo'; // Import the server plugin

export const auth = CinaAuth({
  // ...your other CinaAuth options
  baseURL: 'http://localhost:8081', // The base URL of your application server where the routes are mounted.
  plugins: [expo()], // Add the Expo server plugin
  emailAndPassword: {
    enabled: true,
  },
  // Add other configurations like trustedOrigins
  trustedOrigins: ['myapp://'], // Replace "myapp" with your app's scheme
});
```

### Initialize the CinaAuth Client in Expo

In your Expo app, initialize the client (e.g., in `lib/auth-client.ts`):

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'cinaauth/react';
import { expoClient } from '@cinaauth/expo/client'; // Import the client plugin
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:8081', // Your CinaAuth backend URL
  plugins: [
    expoClient({
      scheme: 'myapp', // Your app's scheme (defined in app.json)
      storagePrefix: 'myapp', // A prefix for storage keys
      storage: SecureStore, // Pass SecureStore for token storage
    }),
  ],
});

// You can also export specific methods if you prefer:
// export const { signIn, signUp, useSession } = authClient;
```

Make sure your app’s scheme (e.g., “myapp”) is defined in your `app.json`.

## Documentation

For more detailed information and advanced configurations, please refer to the
documentation:

* **Main CinaAuth Installation:** [Installation Guide][]
* **Expo Integration Guide:** [Expo Integration Guide][]

## License

MIT

[expo integration guide]: https://www.cinagroup.com/docs/integrations/expo

[installation guide]: https://www.cinagroup.com/docs/installation
