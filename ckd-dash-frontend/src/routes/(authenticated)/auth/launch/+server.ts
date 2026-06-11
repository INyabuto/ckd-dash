import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
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
      secure: true,
    });
    cookies.set("fhir_token_endpoint", tokenEndpoint, {
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // 4. Build the redirect parameter profile targeting Epic's login tower
    const epicAuthUrl = new URL(authorizeEndpoint);
    epicAuthUrl.searchParams.set("response_type", "code");
    epicAuthUrl.searchParams.set(
      "client_id",
      process.env.EPIC_CLIENT_ID || "your-epic-production-client-id",
    );

    // Replace the hardcoded redirect_uri line inside your launch file with this:
    const devMode = url.hostname === "localhost";
    const redirectUri = devMode
      ? "http://localhost:5173/auth/callback"
      : "https://ckd-dash-testing.netlify.app/auth/callback";

    epicAuthUrl.searchParams.set("redirect_uri", redirectUri);

    // epicAuthUrl.searchParams.set(
    //   "redirect_uri",
    //   "https://ckd-dash-testing.netlify.app/auth/callback",
    // );
    epicAuthUrl.searchParams.set(
      "scope",
      "launch patient/Patient.read patient/Observation.read openid fhirUser",
    );
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
