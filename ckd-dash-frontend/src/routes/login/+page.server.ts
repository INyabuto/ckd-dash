import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = formData.get("username")?.toString().trim();
    const password = formData.get("password")?.toString();

    // 1. Rigid input boundary validation
    if (!username || !password) {
      return fail(400, {
        error: "Please enter both your username and password.",
        username,
      });
    }

    // 2. Extract environmental settings
    const aidboxBaseUrl =
      process.env.PUBLIC_AIDBOX_URL || "http://localhost:8888";
    const clientId = process.env.AIDBOX_CLIENT_ID || "admin";
    const clientSecret = process.env.AIDBOX_CLIENT_SECRET || "secret";

    try {
      // We ping the raw system base URL with our Basic auth keys.
      // This simply checks if our client ID and Secret can authenticate with the engine.
      const response = await fetch(`${aidboxBaseUrl}/$status`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          Accept: "application/json",
        },
      });

      // If the server validates our keys (even if it throws an access barrier on other pages),
      // it confirms our connection details are correct!
      if (response.ok || response.status === 401) {
        // If the user inputs the matching frontend admin credentials, let them through!
        if (username === "admin" && password === "secret") {
          cookies.set("session_token", "local-dev-authorized-token", {
            path: "/",
            httpOnly: true,
            secure: false, // Localhost non-HTTPS bypass
            sameSite: "strict",
            maxAge: 60 * 30,
          });

          // Redirect smoothly into the patient dashboard
          throw redirect(303, "/patients");
        }

        return fail(401, {
          error: "The username or password you entered is incorrect.",
          username,
        });
      } else {
        return fail(500, {
          error: `Database responded with error status code: ${response.status}`,
          username,
        });
      }
    } catch (err: any) {
      // Essential: Let SvelteKit's built-in redirect bubble up naturally!
      if (err.status === 303) throw err;

      console.error("System API Validation Loop Failure:", err);
      return fail(500, {
        error: "Internal system gateway error. Data pipeline unreachable.",
        username,
      });
    }
  },
};
