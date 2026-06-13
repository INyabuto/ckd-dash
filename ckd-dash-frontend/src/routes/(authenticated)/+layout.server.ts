// src/routes/+layout.server.ts
import { PUBLIC_AIDBOX_URL } from "$env/static/public";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  let patientId = cookies.get("local_patient_id");
  const sessionToken = cookies.get("session_token"); // 🛠️ ADDED: Fetch the session token to verify auth status
  const headers = { Accept: "application/json" };

  // Shared default structural state
  const profileContext = {
    patient: { name: "Patricia Noelle" },
  };

  // 🛠️ ADDED AUTHENTICATION GUARD: If a user just logged out, these cookies will be gone.
  // We stop execution right here, bypass the Aidbox table search entirely, and return the safe mockup default name.
  if (!patientId || !sessionToken) {
    console.log(
      "🔒 Layout Guard: Logout detected. Returning profile placeholders.",
    );
    return profileContext;
  }

  try {
    // Automatically check the database if the active identifier cookie is missing
    if (!patientId) {
      const patientListRes = await fetch(
        `${PUBLIC_AIDBOX_URL}/Patient?_count=1`,
        { headers },
      );
      if (patientListRes.ok) {
        const listData = await patientListRes.json();
        const firstEntry = listData.entry?.[0];
        patientId = firstEntry?.resource?.id || firstEntry?.id;
      }
    }

    if (!patientId) return profileContext;

    const patientRes = await fetch(
      `${PUBLIC_AIDBOX_URL}/Patient/${patientId}`,
      { headers },
    ).then((res) => (res.ok ? res.json() : null));

    if (patientRes) {
      const nameObject = Array.isArray(patientRes.name)
        ? patientRes.name[0]
        : patientRes.name;
      if (nameObject) {
        const given = Array.isArray(nameObject.given)
          ? nameObject.given.join(" ")
          : nameObject.given || "";
        const family = nameObject.family || "";
        if (given || family) {
          profileContext.patient.name = `${given} ${family}`.trim();
        } else if (nameObject.text) {
          profileContext.patient.name = nameObject.text;
        }
      }
    }

    return profileContext;
  } catch (err) {
    console.warn("Layout context fallback activated:", err);
    return profileContext;
  }
};
