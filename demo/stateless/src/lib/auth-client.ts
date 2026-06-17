import { createAuthClient } from "cinaauth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
