"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

export default function MonthlyUnlockPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const activeSubscription = useQuery(
    (api as any).monthlySubscriptions?.getActive,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Fetch active monthly products
  const products = useQuery((api as any).monthlyProducts?.getActive) || [];

  const handleUnlock = async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (activeSubscription) {
      toast({
        title: "Already Unlocked",
        description: "You already have an active monthly subscription!",
        variant: "default",
      });
      router.push("/our-trainers?tab=monthly");
      return;
    }

    if (!selectedProductId) {
      toast({
        title: "Please Select a Product",
        description: "Please select a monthly subscription product to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/stripe/monthly-unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProductId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Please sign in to unlock monthly access.
            </p>
            <Button onClick={() => router.push("/sign-in")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Already Unlocked!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">
              You already have an active monthly subscription. You can book
              unlimited sessions with any trainer!
            </p>
            <Button
              onClick={() => router.push("/our-trainers?tab=monthly")}
              className="w-full"
              style={{
                backgroundColor: "#F2D578",
                color: "#000000",
              }}
            >
              Go to Trainers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-4" style={{ borderColor: "rgb(242, 213, 120)" }}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2D578]">
                <Lock className="h-8 w-8 text-black" />
              </div>
              <CardTitle className="text-3xl">Unlock All Trainers</CardTitle>
              <p className="mt-2 text-muted-foreground">
                Get unlimited access to all trainers for 1 month
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-6">
                <h3 className="mb-4 text-xl font-bold">What You Get:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-[#F2D578]" />
                    <span>Access to all trainers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-[#F2D578]" />
                    <span>Book unlimited sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-[#F2D578]" />
                    <span>Book with multiple trainers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-[#F2D578]" />
                    <span>Valid for 1 month from payment date</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-[#F2D578]" />
                    <span>No additional payment required for bookings</span>
                  </li>
                </ul>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No monthly subscription products available at the moment.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Select a Plan:</h3>
                    <div className="space-y-3">
                      {products.map((product: any) => (
                        <div
                          key={product._id}
                          className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            selectedProductId === product._id
                              ? "border-[#F2D578] bg-[#F2D578]/10"
                              : "border-gray-600 hover:border-[#F2D578]/50"
                          }`}
                          onClick={() => setSelectedProductId(product._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                    selectedProductId === product._id
                                      ? "border-[#F2D578] bg-[#F2D578]"
                                      : "border-gray-400"
                                  }`}
                                >
                                  {selectedProductId === product._id && (
                                    <div className="h-2 w-2 rounded-full bg-black" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-bold text-lg">
                                    {product.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold">
                                ${product.price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {product.durationMonths} month
                                {product.durationMonths > 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={handleUnlock}
                      disabled={isProcessing || !selectedProductId}
                      className="w-full px-8 py-6 text-lg font-bold"
                      style={{
                        backgroundColor: "#F2D578",
                        color: "#000000",
                      }}
                    >
                      {isProcessing
                        ? "Processing..."
                        : selectedProductId
                          ? `Unlock Now for $${products.find((p: any) => p._id === selectedProductId)?.price.toFixed(2) || "0.00"}`
                          : "Select a Plan"}
                    </Button>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Secure payment powered by Stripe
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
