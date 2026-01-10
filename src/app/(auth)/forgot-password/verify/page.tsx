import { VerifyForgetPasswordOTP } from "@/features/auth/components/verify-forget-password-otp";
import { Suspense } from "react";

export default function ForgetPasswordOTPVerifyPage() {
  return (
    <Suspense>
      <VerifyForgetPasswordOTP />
    </Suspense>
  );
}
