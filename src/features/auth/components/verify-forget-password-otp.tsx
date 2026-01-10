"use client";

import z from "zod";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/use-user-store";
import { useAuth, usePasswordResetCooldownStatus } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, MailIcon, RefreshCwIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

const verifyForgetPasswordOTPSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

type VerifyForgetPasswordOTPFormData = z.infer<
  typeof verifyForgetPasswordOTPSchema
>;

const COOLDOWN_SECONDS = 60;

export const VerifyForgetPasswordOTP = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const { isAuthenticated } = useUserStore();
  const { verifyForgetPasswordOTP, resendPasswordResetOTP } = useAuth();

  const shouldPoll = Boolean(email && !isVerified);
  const { data } = usePasswordResetCooldownStatus(email || "", { enabled: shouldPoll });

  const cooldownRemaining = data?.data?.cooldownRemaining;
  useEffect(() => {
    if (cooldownRemaining && cooldownRemaining > 0) {
      setResendCooldown(cooldownRemaining);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!email) router.replace("/forget-password");
    if (isAuthenticated) router.replace("/");
  }, [email, isAuthenticated, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const form = useForm<VerifyForgetPasswordOTPFormData>({
    resolver: zodResolver(verifyForgetPasswordOTPSchema),
    defaultValues: { otp: "" },
  });

  const otpValue = form.watch("otp");

  const onSubmit = ({ otp }: VerifyForgetPasswordOTPFormData) => {
    setOtpError(null);
    verifyForgetPasswordOTP.mutate(
      { email: email!, otp },
      {
        onSuccess: () => {
          setIsVerified(true);
          form.reset();
          // Redirect to reset password page with email
          router.push(
            `/forgot-password/reset?email=${encodeURIComponent(email!)}`
          );
        },
        onError: (err: any) =>
          setOtpError(err?.message ?? "Invalid or expired code"),
      }
    );
  };

  const handleResend = () => {
    resendPasswordResetOTP.mutate(
      { email: email! },
      {
        onSuccess: () => {
          setResendCooldown(COOLDOWN_SECONDS);
          form.reset({ otp: "" });
          setOtpError(null);
        },
      }
    );
  };

  if (!email || isAuthenticated) return null;
  if (isVerified) return null; // Will redirect in onSuccess

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <MailIcon className="mx-auto h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a verification code to {email}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* OTP */}
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block">
                      Verification code
                    </FormLabel>

                    <FormControl>
                      <div className="flex justify-center py-2">
                        <InputOTP
                          {...field}
                          maxLength={6}
                          autoFocus
                          inputMode="numeric"
                          onChange={(v) => {
                            field.onChange(v);
                            setOtpError(null);
                          }}
                        >
                          <InputOTPGroup className="gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className={`
                                  h-11 w-11 rounded-md text-lg font-medium
                                  bg-background border
                                  transition-all duration-150
                                  focus-visible:ring-2 focus-visible:ring-primary/30
                                  ${
                                    otpError
                                      ? "border-destructive"
                                      : "border-input hover:border-primary"
                                  }
                                `}
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>

                    <FormMessage />

                    {otpError && (
                      <p className="text-sm text-destructive text-center mt-2">
                        {otpError}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Verify */}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  verifyForgetPasswordOTP.isPending || otpValue.length !== 6
                }
              >
                {verifyForgetPasswordOTP.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Verifying…
                  </>
                ) : (
                  "Verify"
                )}
              </Button>

              {/* Resend – PROFESSIONAL */}
              {resendCooldown > 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  You can resend the code in{" "}
                  <span className="font-medium">{resendCooldown}s</span>
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={resendPasswordResetOTP.isPending}
                  className="w-full gap-2"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  {resendPasswordResetOTP.isPending
                    ? "Sending code…"
                    : "Resend verification code"}
                </Button>
              )}

              {/* Back */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/forgot-password")}
                className="w-full"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to forgot password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a
            href="mailto:support@hamsoya.com"
            className="text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
          >
            support@hamsoya.com
          </a>
        </p>
      </div>
    </div>
  );
};
