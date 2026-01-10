import { LoginForm } from "@/features/auth/components/login-form";
import { requiredUnauth } from "@/utils/auth-utils";

export default async function LoginPage() {
  await requiredUnauth();
  return (
    <div className="flex items-center justify-center min-h-screen py-8 bg-background">
      <LoginForm />
    </div>
  );
}
