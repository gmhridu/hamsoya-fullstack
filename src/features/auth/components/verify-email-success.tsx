import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND_NAME } from "@/lib/constants";
import { useAuthStore } from "@/store/use-auth-store";
import { useProfileImageStore } from "@/store/use-profile-image-store";
import { CheckCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export const VerifyEmailSuccess = () => {
  const router = useRouter();
  const setActiveTab = useAuthStore((s) => s.setActiveTab);

  const resetProfileImage = useProfileImageStore((s) => s.resetProfileImage);

  const handleRedirectToLogin = () => {
    resetProfileImage();
    setActiveTab("login");
    router.push("/login");
  };
  return (
    <div className="min-h-screen bg-linear-to-br from-brand-background via-white to-brand-background/50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />

      <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          {/* SUccess Header */}
          <div className="text-center space-y-6 mb-8">
            <div className="w-20 h-20 bg-linear-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto shadow-lg border border-green-300">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 font-serif">
                Email Verified!
              </h1>
              <p className="text-gray-600 text-base">
                Welcome to {BRAND_NAME}! Your account has been successfully
                verified.
              </p>
            </div>
          </div>

          {/* Success Card */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    🎉 Your account is now active and ready to use!
                  </p>
                </div>

                <p className="text-gray-600">
                  You can now sign in to your account and start exploring our
                  premium organic food products.
                </p>
              </div>

              <Button
                onClick={handleRedirectToLogin}
                className="w-full h-12 text-base bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
              >
                Continue to Sign In
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Welcome to the {BRAND_NAME} family! 🌱
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
