# CinaAuth Passkey Plugin

## Installation

```bash
# Using npm
npm install cinaauth @cinaauth/passkey

# Using yarn
yarn add cinaauth @cinaauth/passkey

# Using pnpm
pnpm add cinaauth @cinaauth/passkey

# Using bun
bun add cinaauth @cinaauth/passkey
```

## Usage

### Server

```typescript
import { CinaAuth } from 'cinaauth';
import { passkey } from '@cinaauth/passkey';

export const auth = CinaAuth({
  plugins: [
    passkey({
      rpID: 'example.com',
      rpName: 'My App',
    }),
  ],
});
```

### Client

```typescript
import { createAuthClient } from 'cinaauth/client';
import { passkeyClient } from '@cinaauth/passkey/client';

export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});
```

## Documentation

For more information, visit the [CinaAuth Passkey documentation](https://cinagroup.com/docs/plugins/passkey).

## License

MIT
