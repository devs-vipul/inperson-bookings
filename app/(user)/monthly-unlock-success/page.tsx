"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MonthlyUnlockSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const activeSubscription = useQuery(
    api.monthlySubscriptions.getActive,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  useEffect(() => {
    // Wait a bit for webhook to process, then check subscription
    if (sessionId && convexUser) {
      const timer = setTimeout(() => {
        setIsVerifying(false);
        if (activeSubscription) {
          setIsVerified(true);
        }
      }, 3000); // Wait 3 seconds for webhook to process

      return () => clearTimeout(timer);
    }
  }, [sessionId, convexUser, activeSubscription]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#F2D578]" />
            <p className="text-muted-foreground">
              Verifying your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-4" style={{ borderColor: "rgb(242, 213, 120)" }}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {isVerified
                ? "Your monthly subscription is now active! You can book unlimited sessions with any trainer."
                : "Your payment was successful. Your subscription will be activated shortly."}
            </p>
            {activeSubscription && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold">Subscription Details:</p>
                <p className="text-xs text-muted-foreground">
                  Valid until:{" "}
                  {new Date(activeSubscription.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => router.push("/our-trainers?tab=monthly")}
              className="w-full"
              style={{
                backgroundColor: "#F2D578",
                color: "#000000",
              }}
            >
              Start Booking
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
