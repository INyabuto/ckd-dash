// src/routes/(authenticated)/scheduling/+page.server.ts
import type { PageServerLoad } from "./$types";
import fs from "fs/promises";
import path from "path";
import { dev } from "$app/environment";

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    let rawLoc: string, rawRoles: string, rawSlots: string;

    if (dev) {
      // 💻 LOCAL ENVIRONMENT: Uses your fast, exact disk settings unchanged
      const dataDir = path.resolve("static/fhir-data");
      [rawLoc, rawRoles, rawSlots] = await Promise.all([
        fs.readFile(path.join(dataDir, "locations.ndjson"), "utf-8"),
        fs.readFile(path.join(dataDir, "practitionerroles.ndjson"), "utf-8"),
        fs.readFile(path.join(dataDir, "slots-2025-W45.ndjson"), "utf-8"),
      ]);
    } else {
      // ☁️ NETLIFY PRODUCTION: Uses asset endpoints to bypass serverless container filesystem limits
      const [locRes, roleRes, slotRes] = await Promise.all([
        fetch("/fhir-data/locations.ndjson"),
        fetch("/fhir-data/practitionerroles.ndjson"),
        fetch("/fhir-data/slots-2025-W45.ndjson"),
      ]);

      if (!locRes.ok || !roleRes.ok || !slotRes.ok) {
        throw new Error(
          "Failed to load production FHIR assets from static directory routing",
        );
      }

      [rawLoc, rawRoles, rawSlots] = await Promise.all([
        locRes.text(),
        roleRes.text(),
        slotRes.text(),
      ]);
    }

    // Helper function to parse standard JSON arrays or NDJSON (line-by-line parsing)
    const parseFhirFile = (rawText: string) => {
      const trimmed = rawText.trim();
      // If it's a standard JSON array, parse it directly
      if (trimmed.startsWith("[")) {
        return JSON.parse(trimmed);
      }
      // If it's NDJSON, map over individual lines split by breaks
      return trimmed
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line));
    };

    return {
      fhirData: {
        locations: parseFhirFile(rawLoc),
        practitionerRoles: parseFhirFile(rawRoles),
        slots: parseFhirFile(rawSlots),
      },
    };
  } catch (error) {
    console.error("Error loading local FHIR directory assets:", error);
    return {
      fhirData: { locations: [], practitionerRoles: [], slots: [] },
    };
  }
};
