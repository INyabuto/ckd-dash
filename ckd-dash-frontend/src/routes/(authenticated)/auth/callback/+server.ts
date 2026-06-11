import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  // 1. Capture the temporary code and verification hash returned from Epic
  const authorizationCode = url.searchParams.get("code");

  // 2. Fetch our cached environmental details from our state cookies
  const tokenEndpoint = cookies.get("fhir_token_endpoint");
  const fhirServiceUrl = cookies.get("fhir_service_url");

  if (!authorizationCode || !tokenEndpoint) {
    return new Response(
      "SMART on FHIR Callback missing code token signatures.",
      { status: 400 },
    );
  }

  try {
    // Dynamically determine the redirect URI based on where the app is running
    const devMode = url.hostname === "localhost";
    const redirectUri = devMode
      ? "http://localhost:5173/auth/callback"
      : "https://ckd-dash-testing.netlify.app/auth/callback";

    // 3. The Code-for-Token Token Trade (OAuth 2.0 Authorization Code Grant)
    const tokenExchangeResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: redirectUri, //  Replaced the hardcoded string with our dynamic variable
        client_id:
          process.env.EPIC_CLIENT_ID || "your-epic-production-client-id",
      }),
    });

    if (!tokenExchangeResponse.ok) {
      const errorBody = await tokenExchangeResponse.text();
      console.error(
        "Epic Identity Verification Token Swap Rejected:",
        errorBody,
      );
      return new Response("EHR Identity Verification Loop Denied Access.", {
        status: 401,
      });
    }

    // 4. Parse the cryptographically structured session packet
    const smartTokenDetails = await tokenExchangeResponse.json();

    // CRITICAL SPEC DETAILS: Epic returns the actual Patient ID directly inside the token package!
    const epicPatientId = smartTokenDetails.patient;
    const fhirAccessToken = smartTokenDetails.access_token;

    // 5. Save the live EHR connection tokens into encrypted session cookies
    cookies.set("ehr_access_token", fhirAccessToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: smartTokenDetails.expires_in || 3600,
    });

    cookies.set("ehr_target_patient_id", epicPatientId, {
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // Handshake complete. Route them straight to a specialty Epic data renderer tab!
    throw redirect(303, "/patients/external-ehr-sync");
  } catch (err: any) {
    if (err.status === 303) throw err;
    console.error("SMART on FHIR Callback Exchange Execution Blocked:", err);
    return new Response("Internal error occurred parsing secure EHR tokens.", {
      status: 500,
    });
  }
};
