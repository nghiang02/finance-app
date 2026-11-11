"use client";

import { useSession } from "@finance/api-client";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface AuthGateProps {
  /** "protected": signed-in users only. "guest": sign-in/sign-up pages, signed-out users only. */
  mode: "protected" | "guest";
  children: ReactNode;
}

/**
 * Client-side gate. The server cannot check the session here: the refresh cookie is scoped
 * to /api/v1/auth and the access token lives in memory, so page requests carry no credentials.
 * Data is still safe because every API route checks the access token itself.
 */
export function AuthGate({ mode, children }: AuthGateProps) {
  const { status } = useSession();
  const router = useRouter();
  const mustLeave =
    (mode === "protected" && status === "unauthenticated") ||
    (mode === "guest" && status === "authenticated");

  useEffect(() => {
    if (mustLeave) {
      router.replace(mode === "protected" ? "/login" : "/");
    }
  }, [mustLeave, mode, router]);

  if (status === "loading" || mustLeave) {
    return (
      <p className="py-16 text-center text-zinc-500" role="status">
        Đang tải…
      </p>
    );
  }
  return children;
}
