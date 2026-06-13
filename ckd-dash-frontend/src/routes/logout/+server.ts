import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies }) => {
  // 1. Wipe the secure patient identifier and connection tokens
  cookies.delete("local_patient_id", { path: "/" });
  cookies.delete("session_token", { path: "/" });

  // 2. Redirect cleanly back to your application's home/login portal page
  throw redirect(303, "/");
};
