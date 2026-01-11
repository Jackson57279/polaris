import { stackServerApp } from "@/stack/server";
import { NextResponse } from "next/server";

/**
 * Get authenticated user from Stack Auth in API routes
 * Returns user object or null if not authenticated
 */
export async function getStackUser() {
  try {
    const user = await stackServerApp.getUser();
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Verify user is authenticated, return 401 if not
 * Use this at the start of protected API routes
 */
export async function requireAuth() {
  const user = await getStackUser();
  
  if (!user) {
    return {
      user: null,
      userId: null,
      getToken: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }
  
  // Get auth token for Stack Auth
  const getToken = async () => {
    try {
      const authJson = await user.getAuthJson();
      return authJson.accessToken;
    } catch (error) {
      return null;
    }
  };
  
  return { 
    user, 
    userId: user.id,
    getToken,
    response: null 
  };
}
