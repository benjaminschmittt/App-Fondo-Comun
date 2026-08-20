import { redirect } from "next/navigation";
import { requireUser } from "@/data/auth";

export default async function Home() {
  const user = await requireUser();
  redirect(user.app_metadata?.role === "admin" ? "/admin" : "/dashboard");
}
