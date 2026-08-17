# CinaSeek Accounts

<p align="center">
  <img src="./public/logo.png" alt="CinaSeek Accounts logo" width="96" height="96" />
</p>

This is the user-facing CinaSeek sign-in and account center deployed at
[`accounts.cinaseek.ai`](https://accounts.cinaseek.ai). It is a separately
deployed Next.js frontend backed by the authoritative CinaAuth Worker at
`auth.cinaseek.ai`.

## Getting Started

Here’s how you can get the app running locally:

### Prerequisites

1. **Clone the repo**:

   ```bash
   git clone https://github.com/cinagroup/cinaauth
   cd cinaauth/apps/account-portal
   ```

2. **Install the dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up your environment variables**:

   * Rename the `.env.example` file to `.env`:

     ```bash
     mv .env.example .env
     ```

   * Open `.env` and fill in the required details.
     These will include things like API URLs, client IDs, and secrets needed to
     connect to the CinaAuth service. The portal does not connect directly to
     the identity database; PostgreSQL access remains behind the Auth Worker and
     its Cloudflare Hyperdrive binding.

### Start the Development Server

Once everything is set up, start the development server with:

```bash
pnpm dev
```

The app will be live at [http://localhost:3000](http://localhost:3000).
Open it in your browser, and you’re good to go!

Feel free to jump in and edit the app by modifying `app/page.tsx`.
Any changes you make will update automatically in the browser.

## Features

The account center exposes the user-owned identity workflows enabled by the
deployed Auth Worker:

* **[Email code sign-in][]**: Passwordless authentication with a one-time code.
* **[Organization / Teams][]**: Manage users within organizations or teams.
* **[Passkeys][]**: Passwordless login using modern authentication standards.
* **[Multi-Factor Authentication (MFA)][]**: Add an extra layer of security.
* **[Email Verification][]**: Ensure users verify their email addresses.
* **[Roles & Permissions][]**: Define and manage who can do what.
* **[Rate Limiting][]**: Protect your app from abuse with smart limits.
* **[Session Management][]**: Handle user sessions seamlessly.
* **[Stripe Plugin][]**: Integrate Stripe for customer management,
  subscriptions, and webhooks.

## Learn More

Here are some helpful links if you want to dive deeper:

* [CinaAuth Documentation](https://cinagroup.com/docs) - Framework and identity
  API integration documentation.
* [Next.js Documentation](https://nextjs.org/docs) - Learn about the framework
  we used to build this app.
* [Learn Next.js](https://nextjs.org/learn) - A hands-on tutorial for Next.js.

***

If you run into issues or have suggestions, feel free to open an issue or submit
a pull request on the [GitHub repo](https://github.com/cinagroup/cinaauth).

[email code sign-in]: https://www.cinagroup.com/docs/plugins/email-otp

[email verification]: https://www.cinagroup.com/docs/concepts/email#email-verification

[multi-factor authentication (mfa)]: https://www.cinagroup.com/docs/plugins/2fa

[organization / teams]: https://www.cinagroup.com/docs/plugins/organization

[passkeys]: https://www.cinagroup.com/docs/plugins/passkey

[rate limiting]: https://www.cinagroup.com/docs/concepts/rate-limit

[roles & permissions]: https://www.cinagroup.com/docs/plugins/admin#role

[session management]: https://www.cinagroup.com/docs/concepts/session-management

[stripe plugin]: https://www.cinagroup.com/docs/plugins/stripe
