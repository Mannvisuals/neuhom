import { redirect } from "next/navigation";

// The marketing landing page is a later milestone; for now the app opens on projects.
export default function Home() {
  redirect("/projects");
}
