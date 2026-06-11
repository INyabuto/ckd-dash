// src/routes/auth/launch/+server.ts
import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment"; // 👈 SvelteKit's native environment flag
import type { RequestHandler } from "./$types";
import { EPIC_CLIENT_ID } from "$env/static/private";

export const GET: RequestHandler = async ({ url, cookies, request }) => {
  // 1. Grab the 'iss' (Identity/FHIR Server URL) and 'launch' context variables passed by the EHR
  const fhirServiceUrl = url.searchParams.get("iss");
  const launchContextId = url.searchParams.get("launch");

  if (!fhirServiceUrl) {
    return new Response(
      'Missing required SMART on FHIR "iss" configuration parameter.',
      { status: 400 },
    );
  }

  try {
    // 2. SMART Core Discovery: Read the EHR's open metadata payload to find security endpoints
    const conformanceResponse = await fetch(
      `${fhirServiceUrl}/.well-known/smart-configuration`,
      {
        headers: { Accept: "application/json" },
      },
    );

    const smartConfig = await conformanceResponse.json();
    const authorizeEndpoint = smartConfig.authorization_endpoint;
    const tokenEndpoint = smartConfig.token_endpoint;

    // 3. Cache the temporary transaction states in secure HTTP-only cookies
    cookies.set("fhir_service_url", fhirServiceUrl, {
      path: "/",
      httpOnly: true,
      secure: !dev, // Automatically uses false in local dev, true in production/Netlify
      sameSite: "lax",
    });
    cookies.set("fhir_token_endpoint", tokenEndpoint, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      sameSite: "lax",
    });

    // 4. Build the redirect parameter profile targeting Epic's login tower
    const epicAuthUrl = new URL(authorizeEndpoint);
    epicAuthUrl.searchParams.set("response_type", "code");

    // Fall back safely to standard environment profiles
    epicAuthUrl.searchParams.set("client_id", EPIC_CLIENT_ID);
    // epicAuthUrl.searchParams.set(
    //   "client_id",
    //   process.env.EPIC_CLIENT_ID || "[REGISTERED_EPIC_SANDBOX_CLIENT_ID]",
    // );
    // 🛠️ FIX 1: Explicitly pass the original incoming EHR system URL as the audience target
    epicAuthUrl.searchParams.set("aud", fhirServiceUrl);

    // 🛠️ DYNAMIC RESOLUTION: Read the host directly from the browser's live request headers
    const requestHost = request.headers.get("host") || url.host;
    const protocol = dev ? "http" : "https";
    const redirectUri = `${protocol}://${requestHost}/auth/callback`;

    epicAuthUrl.searchParams.set("redirect_uri", redirectUri);

    // 🛠️ FIX 2: Clean and consolidate scopes to standard open profiles if validation loops fail
    epicAuthUrl.searchParams.set(
      "scope",
      "launch patient/*.read openid fhirUser",
    );

    // epicAuthUrl.searchParams.set(
    //   "scope",
    //   "launch patient/Patient.read patient/Observation.read openid fhirUser",
    // );

    // Note: We will replace this static string with a real signed state hash in our security pass later
    epicAuthUrl.searchParams.set("state", "secure-random-state-hash-string");

    if (launchContextId) {
      epicAuthUrl.searchParams.set("launch", launchContextId);
    }

    // 5. Transfer control directly to Epic's secure user sign-in portal
    throw redirect(302, epicAuthUrl.toString());
  } catch (err: any) {
    if (err.status === 302) throw err; // Let normal redirect execution complete
    console.error("SMART on FHIR Discovery Phase Failure:", err);
    return new Response(
      "Failed to initialize connection with Epic App Marketplace endpoints.",
      { status: 500 },
    );
  }
};
