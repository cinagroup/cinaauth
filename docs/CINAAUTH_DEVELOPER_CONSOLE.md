# CinaAuth Developer Console

`https://accounts.cinaseek.ai/dashboard/developer` is the self-service control plane for OAuth applications owned by an individual CinaAuth account. `auth.cinaseek.ai` remains the authoritative API and issuer; the account portal uses its same-origin `/api/auth/*` proxy and Cloudflare Service Binding.

## Supported client profiles

| Profile | Token authentication | Redirect URI policy | Device Flow |
| --- | --- | --- | --- |
| Web server | `client_secret_basic` | HTTPS; loopback HTTP is allowed for local development | No |
| Native/device | `none` | HTTPS, loopback HTTP, or an application-specific custom scheme | Yes |

Both profiles use Authorization Code. Native/device clients are public clients and must use PKCE. `offline_access` adds the Refresh Token grant. The console intentionally does not expose `client_credentials`; service identities require a separate ownership, permission, rotation, and audit design.

## Security boundaries

- The Worker only grants developer-client access to a signed-in, non-anonymous user with a verified email.
- Client ownership is enforced by the OAuth Provider plugin for list, read, update, rotate, and delete operations. UI visibility is not an authorization boundary.
- Create, update, rotate, delete, and consent mutations require an authoritative session created within the last 15 minutes. These checks bypass the signed Cookie session cache.
- Web callbacks require HTTPS except for loopback development. Native callbacks may additionally use an application-specific custom scheme. Embedded credentials, URL fragments, dangerous schemes, invalid URLs, and more than 10 callbacks are rejected before submission.
- Client secrets are returned only by creation and rotation. The console requires an explicit acknowledgement before dismissing the one-time secret dialog and never writes the value to a URL, toast, local storage, or server-rendered payload.
- Listing and reading clients always remove `client_secret` from the response. Rotation immediately invalidates the previous secret.
- Consent revocation is scoped to the current user. Existing access tokens may remain valid until their expiry or explicit token revocation.

## Endpoint contract

The account portal calls these endpoints through `https://accounts.cinaseek.ai/api/auth/*` so its session Cookie stays on the relying-party origin:

| Operation | Endpoint |
| --- | --- |
| List owned clients | `GET /api/auth/oauth2/get-clients` |
| Create client | `POST /api/auth/oauth2/create-client` |
| Update client | `POST /api/auth/oauth2/update-client` |
| Rotate secret | `POST /api/auth/oauth2/client/rotate-secret` |
| Delete client | `POST /api/auth/oauth2/delete-client` |
| List current-user consents | `GET /api/auth/oauth2/get-consents` |
| Revoke current-user consent | `POST /api/auth/oauth2/delete-consent` |

Device clients use the public production endpoints:

- Device code: `POST https://auth.cinaseek.ai/api/auth/device/code`
- Token polling: `POST https://auth.cinaseek.ai/api/auth/device/token`
- User verification: `https://accounts.cinaseek.ai/device`

The production Worker validates both device-code creation and token polling against its authoritative `oauthClient` table. Only registered, enabled, public clients are accepted.

## Operational acceptance

Code completion is not production acceptance. Before calling the feature commercially ready:

1. Deploy the Auth Worker and account portal independently.
2. Create one confidential web client and one native public client with a disposable verified account.
3. Prove a successful Authorization Code + PKCE flow and the expected rejection of a callback that is not an exact registered URI.
4. Rotate the confidential secret, prove the previous secret fails, and prove the new secret succeeds.
5. Complete Device Flow with the native client and prove an unknown or confidential client cannot request a device code.
6. Revoke a consent and verify reauthorization is required.
7. Retain only non-secret request IDs, timestamps, version IDs, and redacted screenshots as evidence.
