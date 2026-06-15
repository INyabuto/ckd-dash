// src/routes/auth/callback/+server.ts
import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { EPIC_CLIENT_ID, AIDBOX_CLIENT_SECRET } from "$env/static/private";
import { PUBLIC_AIDBOX_URL } from "$env/static/public";
import type { RequestHandler } from "./$types";

async function safeJsonParse(response: Response) {
  if (!response.ok) {
    console.warn(`Epic sub-gateway returned non-OK status: ${response.status}`);
    return null;
  }
  const text = await response.text();
  if (!text || text.trim().length === 0) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
  const authorizationCode = url.searchParams.get("code");
  const tokenEndpoint = cookies.get("fhir_token_endpoint");
  const fhirServiceUrl =
    cookies.get("fhir_service_url") ||
    "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4";

  if (!authorizationCode || !tokenEndpoint) {
    return new Response("Missing required authentication signatures.", {
      status: 400,
    });
  }

  try {
    const requestHost = request.headers.get("host") || url.host;
    const protocol = dev ? "http" : "https";
    const redirectUri = `${protocol}://${requestHost}/auth/callback`;

    const tokenExchangeResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: redirectUri,
        client_id: EPIC_CLIENT_ID,
      }),
    });

    if (!tokenExchangeResponse.ok) {
      return new Response("EHR Identity Verification Loop Denied Access.", {
        status: 401,
      });
    }

    const smartTokenDetails = await tokenExchangeResponse.json();
    const epicPatientId = smartTokenDetails.patient;
    const fhirAccessToken = smartTokenDetails.access_token;

    const epicHeaders = {
      Authorization: `Bearer ${fhirAccessToken}`,
      Accept: "application/fhir+json",
    };

    const [patientRaw, medsRaw, carePlanRaw, obsRaw] = await Promise.all([
      fetch(`${fhirServiceUrl}/Patient/${epicPatientId}`, {
        headers: epicHeaders,
      }).then(safeJsonParse),
      fetch(
        `${fhirServiceUrl}/MedicationRequest?patient=${epicPatientId}&status=active`,
        { headers: epicHeaders },
      ).then(safeJsonParse),
      fetch(
        `${fhirServiceUrl}/CarePlan?patient=${epicPatientId}&category=assess-plan`,
        { headers: epicHeaders },
      ).then(safeJsonParse),
      fetch(
        `${fhirServiceUrl}/Observation?patient=${epicPatientId}&code=62238-1,2160-0,2339-0,85354-9`,
        { headers: epicHeaders },
      ).then(safeJsonParse),
    ]);

    const transactionEntries: any[] = [];

    // 1. Scrub Patient Data
    if (patientRaw && patientRaw.resourceType === "Patient") {
      const cleanPatient = {
        resourceType: "Patient",
        id: patientRaw.id,
        active: true,
        name: patientRaw.name || [{ use: "official", text: "Valued Patient" }],
        gender: patientRaw.gender || "unknown",
        birthDate: patientRaw.birthDate || "1970-01-01",
      };
      transactionEntries.push({
        request: { method: "PUT", url: `Patient/${cleanPatient.id}` },
        resource: cleanPatient,
      });
    }

    // 2. Scrub CarePlan Data
    if (carePlanRaw && Array.isArray(carePlanRaw.entry)) {
      carePlanRaw.entry.forEach((e: any) => {
        if (e?.resource?.id && e.resource.resourceType === "CarePlan") {
          const cleanCarePlan = {
            resourceType: "CarePlan",
            id: e.resource.id,
            status: e.resource.status || "active",
            intent: e.resource.intent || "plan",
            subject: { reference: `Patient/${epicPatientId}` },
            title: e.resource.title || "Clinical Care Plan",
            description:
              e.resource.description ||
              e.resource.category?.[0]?.text ||
              "Synchronized Itinerary",
          };
          transactionEntries.push({
            request: { method: "PUT", url: `CarePlan/${cleanCarePlan.id}` },
            resource: cleanCarePlan,
          });
        }
      });
    }
    //console.log(medsRaw);

    // // 3. 🛠️ AIDBOX NATIVE TRANSACTION FIX: Map explicitly to Aidbox native expectations
    // if (medsRaw && Array.isArray(medsRaw.entry)) {
    //   medsRaw.entry.forEach((e: any) => {
    //     if (
    //       e?.resource?.id &&
    //       e.resource.resourceType === "MedicationRequest"
    //     ) {
    //       const rawMed = e.resource;

    //       // Safely capture the descriptive title of the medication from Epic's format
    //       const medText =
    //         rawMed.medicationReference?.display ||
    //         rawMed.medicationCodeableConcept?.text ||
    //         "Unassigned Medication";

    //       const cleanMedRequest = {
    //         resourceType: "MedicationRequest",
    //         id: rawMed.id,
    //         status: rawMed.status || "active",
    //         intent: rawMed.intent || "order",

    //         // Link back to the patient using Aidbox native object references
    //         patient: {
    //           id: epicPatientId,
    //           resourceType: "Patient",
    //         },

    //         // 🛠️ FIX: Fulfill the mandatory requirement using Aidbox Native reference format
    //         medication: {
    //           id: `med-desc-${rawMed.id}`,
    //           resourceType: "Medication",
    //         },

    //         // 🛠️ FIX: Store the actual descriptive text inside a clean extension value block
    //         extension: [
    //           {
    //             url: "http://aidbox.local/extensions/medication-display-name",
    //             value: medText,
    //           },
    //         ],

    //         // 🛠️ FIX: Flatten out the complex dosage instruction down to a single text primitive
    //         // This safely bypasses 'unknown key :doseQuantity' and 'asNeededBoolean' schema errors
    //         dosageInstruction: [
    //           {
    //             text:
    //               rawMed.dosageInstruction?.[0]?.text ||
    //               "Take as directed by your physician.",
    //           },
    //         ],
    //       };

    //       transactionEntries.push({
    //         request: {
    //           method: "PUT",
    //           url: `MedicationRequest/${cleanMedRequest.id}`,
    //         },
    //         resource: cleanMedRequest,
    //       });
    //       console.log(cleanMedRequest);
    //     }
    //   });
    // }

    // 4. Scrub Observation Data (eGFR, Creatinine, Glucose, BP)
    if (obsRaw && Array.isArray(obsRaw.entry)) {
      obsRaw.entry.forEach((e: any) => {
        if (e?.resource?.id && e.resource.resourceType === "Observation") {
          const rawObs = e.resource;

          // Build a clean observation resource, stripping proprietary elements
          const cleanObs: any = {
            resourceType: "Observation",
            id: rawObs.id,
            status: rawObs.status || "final",
            code: rawObs.code,
            subject: { reference: `Patient/${epicPatientId}` },
            effectiveDateTime:
              rawObs.effectiveDateTime || new Date().toISOString(),
          };

          // Maintain values for composite (BP) or standard single values
          if (rawObs.valueQuantity) {
            cleanObs.valueQuantity = rawObs.valueQuantity;
          }

          if (rawObs.component) {
            cleanObs.component = rawObs.component;
          }

          transactionEntries.push({
            request: { method: "PUT", url: `Observation/${cleanObs.id}` },
            resource: cleanObs,
          });
        }
      });
    }

    // 5. Commit Transaction Bundle to Aidbox
    if (transactionEntries.length > 0) {
      const aidboxBundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: transactionEntries,
      };

      // 🟩 FIX: Automatically use "root" locally and "ckd-dash-ui" when live on Netlify
      const aidboxClientId = dev ? "root" : "ckd-dash-ui";

      // Dynamically combine the correct client ID with your client secret token
      const aidboxAuth = Buffer.from(
        `${aidboxClientId}:${AIDBOX_CLIENT_SECRET}`,
      ).toString("base64");

      // const aidboxAuth = Buffer.from(`root:${AIDBOX_CLIENT_SECRET}`).toString(
      //   "base64",
      // );
      const aidboxWriteResponse = await fetch(`${PUBLIC_AIDBOX_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${aidboxAuth}`,
        },
        body: JSON.stringify(aidboxBundle),
      });

      if (!aidboxWriteResponse.ok) {
        const errorContent = await aidboxWriteResponse.text();
        console.error("Aidbox Rejected structural write:", errorContent);
        return new Response(
          `Aidbox Database Rejected Ingestion. Reason: ${errorContent}`,
          { status: 500 },
        );
      }
    }

    cookies.set("session_token", "fhir_session_validated", {
      path: "/",
      httpOnly: true,
      secure: !dev,
      sameSite: "lax",
      maxAge: 1800,
    });
    cookies.set("local_patient_id", epicPatientId, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      sameSite: "lax",
      maxAge: 1800,
    });

    throw redirect(303, "/patients/dashboard");
  } catch (err: any) {
    if (err.status === 303) throw err;
    console.error("Critical Ingestion Inbound Pipeline Failure Trace:", err);
    return new Response(
      `Data Ingestion Flow Broke Down. Error details: ${err.message || err}`,
      { status: 500 },
    );
  }
};
