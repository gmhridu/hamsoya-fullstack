"use client";

import z from "zod";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/use-user-store";
import { useAuth, useCooldownStatus } from "@/features/auth/hooks/use-auth";
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
import { VerifyEmailSuccess } from "@/features/auth/components/verify-email-success";
import { useAuthStore } from "@/store/use-auth-store";

const verifyEmailSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

const COOLDOWN_SECONDS = 60;

export const VerifyEmailClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const { isAuthenticated } = useUserStore();
  const { verifyOTP, resendOTP } = useAuth();

  const resetProfileImage = useAuthStore((s) => s.resetProfileImage);

  const shouldPoll = Boolean(email && !isVerified);
  const { data } = useCooldownStatus(email || "", { enabled: shouldPoll });

  const cooldownRemaining = data?.data?.cooldownRemaining;
  useEffect(() => {
    if (cooldownRemaining && cooldownRemaining > 0) {
      setResendCooldown(cooldownRemaining);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!email) router.replace("/login");
    if (isAuthenticated) router.replace("/");
  }, [email, isAuthenticated, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const form = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { otp: "" },
  });

  const otpValue = form.watch("otp");

  const onSubmit = ({ otp }: VerifyEmailFormData) => {
    setOtpError(null);
    verifyOTP.mutate(
      { email: email!, otp },
      {
        onSuccess: () => {
          setIsVerified(true);

          form.reset();

          resetProfileImage();
        },
        onError: (err: any) =>
          setOtpError(err?.message ?? "Invalid or expired code"),
      }
    );
  };

  const handleResend = () => {
    resendOTP.mutate(
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
  if (isVerified) return <VerifyEmailSuccess  />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <MailIcon className="mx-auto h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
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
                disabled={verifyOTP.isPending || otpValue.length !== 6}
              >
                {verifyOTP.isPending ? (
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
                  disabled={resendOTP.isPending}
                  className="w-full gap-2"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  {resendOTP.isPending
                    ? "Sending code…"
                    : "Resend verification code"}
                </Button>
              )}

              {/* Back */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/login")}
                className="w-full"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
