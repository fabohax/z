"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { socialProviders } from "@/lib/auth";

const icons: Record<string, string> = {
  Google: "G",
  Apple: "",
  X: "X",
  TikTok: "♪",
  WeChat: "微",
};

export function SocialLoginButtons({ buttonClassName = "" }: { buttonClassName?: string }) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {socialProviders.map((provider) => (
        <button
          key={provider.id}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-black disabled:opacity-60 cursor-pointer ${buttonClassName}`}
          disabled={isPending && pendingProvider === provider.id}
          onClick={() => {
            setPendingProvider(provider.id);
            startTransition(() => {
              (async () => {
                await signIn(provider.id);
              })();
            });
          }}
        >
          <span className="text-lg">{icons[provider.name] || provider.name[0]}</span>
          <span>Sign in with {provider.name}</span>
        </button>
      ))}
    </div>
  );
}
