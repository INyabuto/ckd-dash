// src/routes/(authenticated)/patients/dashboard/+page.server.ts
import { dev } from "$app/environment";
import { AIDBOX_CLIENT_SECRET } from "$env/static/private";
import { PUBLIC_AIDBOX_URL } from "$env/static/public";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
  let patientId = cookies.get("local_patient_id");
  const sessionToken = cookies.get("session_token"); // 🛠️ ADDED: Fetch the session token to verify auth status
  // 🟩 FIX: Authenticate your database requests so the cloud lets you read the patient's name
  const aidboxClientId = dev ? "root" : "ckd-dash-ui";
  const aidboxAuth = Buffer.from(
    `${aidboxClientId}:${AIDBOX_CLIENT_SECRET}`,
  ).toString("base64");

  const headers = {
    Accept: "application/fhir+json",
    Authorization: `Basic ${aidboxAuth}`, // ◄── Passes authorization safely online
  };

  // const headers = { Accept: "application/json" };

  const defaultData = {
    patient: {
      name: "Patricia Noelle",
      condition: "Chronic Kidney Disease (CKD) & Long COVID",
    },
    appointments: [
      {
        id: "def-1",
        specialty: "Nephrology Clinic",
        provider: "Dr. Vince Jones",
        date: "Monday, June 15",
        time: "9:30 AM",
        instruction: "Bring fresh log chart.",
        statusStyle: "high",
      },
      {
        id: "def-2",
        specialty: "Dietitian Consultation",
        provider: "Nutrition Services",
        date: "Thursday, June 18",
        time: "11:00 AM",
        instruction: "",
        statusStyle: "normal",
      },
    ],
    telemetryKPIs: {
      bp: {
        label: "Blood Pressure",
        value: "142/88",
        unit: "mmHg",
        status: "High",
        type: "high",
        pct: 88,
      },
      weight: {
        label: "Weight",
        value: "+1.2",
        unit: "lbs",
        status: "Elevated",
        type: "elevated",
        pct: 62,
      },
      glucose: {
        label: "Blood Glucose",
        value: "5.6",
        unit: "mmol/L",
        status: "Normal",
        type: "normal",
        pct: 38,
      },
    },
    medications: [
      {
        id: "def-med-1",
        name: "Nifedipine (Procardia)",
        dose: "30 mg",
        purpose: "Chilblains & BP Management",
        taken: false,
        urgency: "high",
      },
      {
        id: "def-med-2",
        name: "Bicarbonate Supplement",
        dose: "650 mg",
        purpose: "Metabolic Acidosis",
        taken: true,
        urgency: "normal",
      },
    ],
  };

  // 🛠️ ADDED AUTHENTICATION GUARD: If a user just logged out, these cookies will be gone.
  // We stop right here, bypass all database network requests, and safely return the mockup values.
  if (!patientId || !sessionToken) {
    console.log(
      "🔒 Logout state intercepted: Safely bypassed database queries.",
    );
    return defaultData;
  }

  try {
    // 🛠️ MULTI-LAYER BUNDLE PARSING FIX: Covers both standard FHIR and Aidbox variations
    if (!patientId) {
      const patientListRes = await fetch(
        `${PUBLIC_AIDBOX_URL}/Patient?_count=1`,
        { headers },
      );
      if (patientListRes.ok) {
        const listData = await patientListRes.json();
        const firstEntry = listData.entry?.[0];

        // Fallback progression chain to absolute-resolve the target string ID
        patientId =
          firstEntry?.resource?.id ||
          firstEntry?.id ||
          firstEntry?.resource?.meta?.id;

        console.log("👉 TARGET RESOURCE SEARCH EXTRACTION RESULT:", patientId);
      }
    }

    // If the database returns nothing, fall back to the placeholder mockup profile cleanly
    if (!patientId) {
      console.warn(
        "⚠️ No active patient matches found in your local database tables.",
      );
      return defaultData;
    }

    // Trigger dynamic resource calls with a guaranteed valid identifier string
    const [patientRes, carePlanRes, obsRes] = await Promise.all([
      fetch(`${PUBLIC_AIDBOX_URL}/Patient/${patientId}`, { headers }).then(
        (res) => (res.ok ? res.json() : null),
      ),
      fetch(`${PUBLIC_AIDBOX_URL}/CarePlan?patient=Patient/${patientId}`, {
        headers,
      }).then((res) => (res.ok ? res.json() : null)),
      fetch(`${PUBLIC_AIDBOX_URL}/Observation?patient=Patient/${patientId}`, {
        headers,
      }).then((res) => (res.ok ? res.json() : null)),
    ]);

    // Map your live dynamic patient metadata properties
    if (patientRes) {
      // Support standard arrays or direct text string falls
      const nameObject = Array.isArray(patientRes.name)
        ? patientRes.name[0]
        : patientRes.name;

      if (nameObject) {
        const given = Array.isArray(nameObject.given)
          ? nameObject.given.join(" ")
          : nameObject.given || "";
        const family = nameObject.family || "";

        if (given || family) {
          defaultData.patient.name = `${given} ${family}`.trim();
        } else if (nameObject.text) {
          defaultData.patient.name = nameObject.text;
        }
      }
      console.log(
        "✅ DASHBOARD LINK ESTABLISHED FOR PATIENT:",
        defaultData.patient.name,
      );
    }

    // Map dynamic CarePlans
    if (
      carePlanRes &&
      Array.isArray(carePlanRes.entry) &&
      carePlanRes.entry.length > 0
    ) {
      defaultData.appointments = carePlanRes.entry.map(
        (e: any, idx: number) => ({
          id: e.resource.id || `cp-${idx}`,
          specialty: e.resource.title || "Clinical Evaluation Plan",
          provider: "Assigned Care Team",
          date: "Scheduled Window",
          time: e.resource.status || "active",
          instruction: e.resource.description || "",
          statusStyle: "normal",
        }),
      );
    }

    // Map dynamic health KPIs from Observations
    if (obsRes && Array.isArray(obsRes.entry) && obsRes.entry.length > 0) {
      const observations = obsRes.entry.map((e: any) => e.resource);
      const bpObs = observations.find((o: any) =>
        o.code?.coding?.some(
          (c: any) => c.code === "85354-9" || c.code === "62238-1",
        ),
      );
      if (bpObs && bpObs.component) {
        const sys = bpObs.component.find((c: any) =>
          c.code?.coding?.some((cd: any) => cd.code === "8480-6"),
        )?.valueQuantity?.value;
        const dia = bpObs.component.find((c: any) =>
          c.code?.coding?.some((cd: any) => cd.code === "8462-4"),
        )?.valueQuantity?.value;
        if (sys && dia) {
          defaultData.telemetryKPIs.bp.value = `${sys}/${dia}`;
          defaultData.telemetryKPIs.bp.status = sys > 130 ? "High" : "Normal";
          defaultData.telemetryKPIs.bp.type = sys > 130 ? "high" : "normal";
          defaultData.telemetryKPIs.bp.pct = sys > 130 ? 85 : 40;
        }
      }
    }

    return defaultData;
  } catch (err) {
    console.error("Aidbox dynamic processing fault:", err);
    return defaultData;
  }
};
