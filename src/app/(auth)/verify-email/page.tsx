import { VerifyEmailClient } from "@/features/auth/components/verify-email-client";
import { Suspense } from "react";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailClient />
    </Suspense>
  );
}
