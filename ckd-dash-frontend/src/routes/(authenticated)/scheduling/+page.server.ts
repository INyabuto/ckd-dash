// src/routes/(authenticated)/scheduling/+page.server.ts
import type { PageServerLoad } from "./$types";
import fs from "fs/promises";
import path from "path";

export const load: PageServerLoad = async () => {
  try {
    // Resolve absolute paths to the asset folder in the root static directory
    const dataDir = path.resolve("static/fhir-data");

    // Read the raw file streams concurrently
    const [rawLoc, rawRoles, rawSlots] = await Promise.all([
      fs.readFile(path.join(dataDir, "locations.ndjson"), "utf-8"),
      fs.readFile(path.join(dataDir, "practitionerroles.ndjson"), "utf-8"),
      fs.readFile(path.join(dataDir, "slots-2025-W45.ndjson"), "utf-8"),
    ]);

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
