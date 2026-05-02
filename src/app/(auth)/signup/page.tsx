import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect("/");
  return <AuthForm mode="signup" />;
}
