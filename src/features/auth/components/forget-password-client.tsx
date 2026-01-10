"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { BRAND_NAME } from "@/lib/constants";
import { ArrowLeftIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaInput,
} from "@/features/auth/interface/auth.interface";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "../hooks/use-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const ForgetPasswordClient = () => {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const form = useForm<ForgotPasswordSchemaInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordSchemaInput) => {
    forgotPassword.mutate(data, {
      onSuccess: () => {
        toast.success("We’ve sent a verification code to your email.");
        router.replace(
          `/forgot-password/verify?email=${encodeURIComponent(data.email)}`
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-linear-to-r from-primary to-accent" />
            <span className="font-serif text-2xl font-bold text-primary">
              {BRAND_NAME}
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email address and we'll send you a verification code to
            reset your password
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel
                          htmlFor="email"
                          className="text-sm font-medium text-foreground"
                        >
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email address"
                              className="pl-10 h-11 transition-colors focus:ring-2 focus:ring-primary/20"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                  disabled={forgotPassword.isPending}
                >
                  {forgotPassword.isPending ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <MailIcon className="mr-2 size-4" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
