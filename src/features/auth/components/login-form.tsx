"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  LoginSchema,
  LoginSchemaInput,
} from "@/features/auth/interface/auth.interface";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { BRAND_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/use-auth-store";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ProfileImageUpload } from "@/features/auth/components/profile-image-upload";
import { Separator } from "@/components/ui/separator";
import { useLogin, useRegisterUser } from "@/features/auth/hooks/use-auth";
import { generateCSRFToken } from "@/lib/csrf";
import { toast } from "sonner";
import { useProfileImageStore } from "@/store/use-profile-image-store";

const RegisterSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    phone_number: z.string().optional(),
    profile_image_url: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterSchemaInput = z.infer<typeof RegisterSchema>;

export const LoginForm = () => {
  const router = useRouter();
  const registerUser = useRegisterUser();
  const activeTab = useAuthStore((s) => s.activeTab);
  const setActiveTab = useAuthStore((s) => s.setActiveTab);
  const profileImageUrl = useAuthStore((s) => s.profileImageUrl);
  const profileImageField = useAuthStore((s) => s.profileImageField);
  const setProfileImage = useAuthStore((s) => s.setProfileImage);
  const resetProfileImage = useAuthStore((s) => s.resetProfileImage);
  const setImage = useProfileImageStore((s) => s.setImage);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    if (profileImageUrl && profileImageField) {
      setImage(profileImageUrl, profileImageField);
    }
    setCsrfToken(generateCSRFToken());
  }, [profileImageUrl, profileImageField, setImage]);


  const loginForm = useForm<LoginSchemaInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  // ── Register Form ────────────────────────────────────────────
  const registerForm = useForm<RegisterSchemaInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone_number: "",
      profile_image_url: "",
    },
    mode: "onChange",
  });

  const loginMutation = useLogin();

  const onLoginSubmit = (data: LoginSchemaInput) => {
    const toastId = toast.loading("Signing in...", {
      description: "Please wait while we authenticate you.",
    });

    loginMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Login successful 🎉", {
          id: toastId,
          description: "You are now signed in.",
        });
        router.replace("/");
      },
      onError: (error: any) => {
        toast.error("Login failed", {
          id: toastId,
          description:
            error?.message ?? "Invalid email or password. Please try again.",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterSchemaInput) => {
    const toastId = toast.loading("Creating your account…", {
      description: "This will only take a moment.",
    });

    const { confirmPassword, ...registerData } = data;

    registerUser.mutate(
      {
        ...registerData,
        profile_image_url: profileImageUrl || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Account created 🎉", {
            id: toastId,
            description: "We’ve sent a verification code to your email.",
          });
          setProfileImage("", "");
          resetProfileImage();
          registerForm.reset();
          router.replace(
            `/verify-email?email=${encodeURIComponent(data.email)}`
          );
        },
        onError: (error) => {
          toast.error("Registration failed", {
            id: toastId,
            description:
              error?.message ??
              "Something went wrong. Please check your details and try again.",
          });
        },
      }
    );
  };

  const isLoginPending = loginMutation.isPending;
  const isRegisterPending = registerUser.isPending;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{BRAND_NAME}</h1>
        <p className="text-muted-foreground">
          Welcome to Premium Organic Food & Everyday Essentials
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value: string) =>
          setActiveTab(value as "login" | "signup")
        }
        className="w-full"
      >
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <h2 className="text-2xl font-semibold text-center">Welcome</h2>
          </CardHeader>

          <CardContent className="pt-0">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="login" className="text-sm font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-0 mt-6">
              <Form {...loginForm}>
                <form
                  className="space-y-6"
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : "focus:border-primary/60 focus:ring-primary/20"
                                }`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : "focus:border-primary/60 focus:ring-primary/20"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOffIcon size={16} />
                              ) : (
                                <EyeIcon size={16} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium"
                    size="lg"
                    disabled={isLoginPending}
                  >
                    {isLoginPending ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  prefetch
                >
                  Forgot your password?
                </Link>
              </div>
            </TabsContent>


            <TabsContent value="signup" className="space-y-0 mt-6">
              <Form {...registerForm}>
                <form
                  className="space-y-6"
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                >
                  {/* Name */}
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your full name"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone (optional) */}
                  <FormField
                    control={registerForm.control}
                    name="phone_number"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>
                          Phone Number{" "}
                          <span className="text-muted-foreground">
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <PhoneIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="Enter your phone number"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Profile Picture */}
                  <FormField
                    control={registerForm.control}
                    name="profile_image_url"
                    render={({ fieldState }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Profile Picture{" "}
                          <span className="text-muted-foreground">
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex flex-col items-center justify-center py-4 space-y-2">
                            <ProfileImageUpload
                              userId={profileImageField}
                              size="lg"
                              preserveOnUnmount
                              onImageUpload={(url, fileId) => {
                                setProfileImage(url, fileId);
                                registerForm.setValue("profile_image_url", url);
                              }}
                              onImageRemove={() => {
                                setProfileImage("", "");
                                resetProfileImage();
                                registerForm.setValue("profile_image_url", "");
                              }}
                              resetTrigger={profileImageUrl === ""}
                            />
                            <p className="text-xs text-muted-foreground">
                              Click the circle to upload or drag an image here
                            </p>
                          </div>
                        </FormControl>
                        {fieldState.error && (
                          <p className="text-sm font-medium text-destructive">
                            {fieldState.error.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOffIcon size={16} />
                              ) : (
                                <EyeIcon size={16} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="********"
                              className={`pl-10 h-11 transition-all duration-200
                                ${
                                  fieldState.error
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOffIcon size={16} />
                              ) : (
                                <EyeIcon size={16} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium"
                    size="lg"
                    disabled={isRegisterPending}
                  >
                    {isRegisterPending ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6">
                <Separator className="my-4" />
                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="text-primary hover:text-primary/80"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:text-primary/80"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

