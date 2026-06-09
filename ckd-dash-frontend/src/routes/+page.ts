import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = () => {
  // Force anyone hitting the bare domain to instantly skip to the login gate
  throw redirect(302, "/login");
};
