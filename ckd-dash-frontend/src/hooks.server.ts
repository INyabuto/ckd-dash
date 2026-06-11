// src/routes/hooks.server.ts
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  // 1. Extract the secure HTTP-Only session token and target pathname
  const sessionToken = event.cookies.get("session_token");
  const pathname = event.url.pathname;

  // 2. Define Public Bypass Routes (Paths that NEVER require authentication)
  const isLoginPage = pathname === "/login";

  // SMART on FHIR Handshake callback routes must remain open for external EHR pings
  const isSmartFederation =
    pathname.startsWith("/auth/launch") ||
    pathname.startsWith("/auth/callback");

  // Open database check route for local/cloud network handshake verification
  const isHealthGateway = pathname.startsWith("/api/health");

  // Combine into a single boolean validation gate
  const isPublicRoute = isLoginPage || isSmartFederation || isHealthGateway;

  // 3. Evaluation Gate A: Unauthenticated users attempting to access internal workspaces
  if (!sessionToken && !isPublicRoute) {
    // Instantly route them back to the login screen safely
    throw redirect(302, "/login");
  }

  // 4. Evaluation Gate B: Authenticated users trying to navigate back to the login screen
  if (sessionToken && isLoginPage) {
    // Prevent double-dipping and instantly forward them back to the active canvas
    throw redirect(302, "/patients/dashboard");
  }

  // 5. Safe Passage: Let the request proceed to its component layout
  return await resolve(event);
};
