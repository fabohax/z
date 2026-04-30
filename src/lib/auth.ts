import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";

type SocialProviderMeta = {
  id: "google" | "apple" | "twitter" | "tiktok" | "wechat";
  name: string;
  description: string;
  enabled: boolean;
  statusLabel: string;
};

const isConfigured = (clientId?: string, clientSecret?: string) => {
  return Boolean(clientId && clientSecret);
};

const googleEnabled = isConfigured(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
const appleEnabled = isConfigured(
  process.env.APPLE_CLIENT_ID,
  process.env.APPLE_CLIENT_SECRET,
);
const xEnabled = isConfigured(process.env.X_CLIENT_ID, process.env.X_CLIENT_SECRET);

export const socialProviders: SocialProviderMeta[] = [
  {
    id: "google",
    name: "Google",
    description: "Quick sign-in with Google.",
    enabled: googleEnabled,
    statusLabel: googleEnabled ? "Ready" : "Set up",
  },
  {
    id: "apple",
    name: "Apple",
    description: "Secure access with Apple.",
    enabled: appleEnabled,
    statusLabel: appleEnabled ? "Ready" : "Set up",
  },
  {
    id: "twitter",
    name: "X",
    description: "Continue with your X account.",
    enabled: xEnabled,
    statusLabel: xEnabled ? "Ready" : "Set up",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Coming soon.",
    enabled: false,
    statusLabel: "Soon",
  },
  {
    id: "wechat",
    name: "WeChat",
    description: "Coming soon.",
    enabled: false,
    statusLabel: "Soon",
  },
];

const providers = [];

if (googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

if (appleEnabled) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  );
}

if (xEnabled) {
  providers.push(
    TwitterProvider({
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
      version: "2.0",
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "z-dev-secret-change-me",
};
