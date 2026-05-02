import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="signup"
      googleEnabled={isGoogleConfigured()}
      initialError={error ?? null}
    />
  );
}
