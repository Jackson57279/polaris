"use client";

import { useMutation } from "convex/react";
import { useUser } from "@stackframe/stack";
import { useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";

export function useUserSync() {
  const user = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!user || hasSynced.current) return;

    const syncUser = async () => {
      try {
        await getOrCreateUser({});
        hasSynced.current = true;
      } catch (error) {
        console.error("Failed to sync user to Convex:", error);
      }
    };

    syncUser();
  }, [user, getOrCreateUser]);

  useEffect(() => {
    if (!user) {
      hasSynced.current = false;
    }
  }, [user]);
}
