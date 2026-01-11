"use client";

import { useUser } from "@stackframe/stack";

import { useUserSync } from "@/hooks/use-user-sync";
import { AuthLoadingView } from "./auth-loading-view";

interface UserInitializerProps {
  children: React.ReactNode;
}

export function UserInitializer({ children }: UserInitializerProps) {
  const user = useUser();
  
  useUserSync();

  if (user === undefined) {
    return <AuthLoadingView />;
  }

  return <>{children}</>;
}
