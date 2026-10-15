"use client";

import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import AuthShell from "@/app/components/AuthShell";

export default function SignUpPage() {
  const { signUp } = useSignUp();

  const signUpWithGoogle = async () => {
    await signUp?.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/chat",
    });
  };

  return (
    <AuthShell
      title="Make it yours."
      subtitle="A private workspace for chat, documents, interviews, and debates."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[var(--cream)] underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={signUpWithGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--lime)] px-4 py-3.5 text-sm font-medium text-[var(--lime-ink)]"
      >
        Continue with Google
      </button>
    </AuthShell>
  );
}
