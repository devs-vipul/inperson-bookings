"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BookingFailedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error") || "Payment was not completed";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Failed Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="mb-4 flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div
              className="rounded-full p-6 border-4"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "#ef4444",
              }}
            >
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
          </motion.div>
          <h1 className="mb-2 text-4xl font-bold text-red-600">
            Booking Failed
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Unfortunately, we couldn't complete your booking.
          </p>
        </motion.div>

        {/* Error Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="mb-6 border-2 border-red-500">
            <CardContent className="p-8 text-center space-y-4">
              <div
                className="rounded-lg border-2 p-4"
                style={{
                  borderColor: "#ef4444",
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                }}
              >
                <h3 className="font-bold text-lg text-red-600 mb-2">
                  What happened?
                </h3>
                <p className="text-muted-foreground font-medium">
                  {error}
                </p>
              </div>

              <div
                className="rounded-lg border-2 p-4"
                style={{
                  borderColor: "#F2D578",
                  backgroundColor: "rgba(242, 213, 120, 0.05)",
                }}
              >
                <h3 className="font-bold text-lg mb-2" style={{ color: "#F2D578" }}>
                  What's next?
                </h3>
                <ul className="text-sm text-muted-foreground font-medium space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F2D578" }}>•</span>
                    <span>Check your payment details and try again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F2D578" }}>•</span>
                    <span>Ensure you have sufficient funds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F2D578" }}>•</span>
                    <span>Contact support if the problem persists</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-lg border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "black",
                borderColor: "#F2D578",
              }}
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Try Again
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-lg border-2"
              style={{
                backgroundColor: "black",
                color: "#F2D578",
                borderColor: "#F2D578",
              }}
              onClick={() => router.push("/our-trainers")}
            >
              Browse Trainers
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
