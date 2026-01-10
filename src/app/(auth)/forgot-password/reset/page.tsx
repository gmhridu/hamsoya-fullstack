import { ResetPasswordClient } from "@/features/auth/components/reset-password-client";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}
