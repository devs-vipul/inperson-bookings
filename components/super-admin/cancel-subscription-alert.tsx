"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface CancelSubscriptionAlertProps {
  subscriptionId: Id<"subscriptions">;
  stripeSubscriptionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelSubscriptionAlert({
  subscriptionId,
  stripeSubscriptionId,
  open,
  onOpenChange,
}: CancelSubscriptionAlertProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const cancelSubscription = useMutation(api.subscriptions.cancel);
  const cancelInStripe = useAction(api.subscriptions.cancelInStripe);

  const handleCancel = async () => {
    setLoading(true);
    try {
      // Cancel in Stripe FIRST (only if stripeSubscriptionId is provided)
      if (stripeSubscriptionId) {
        await cancelInStripe({
          stripeSubscriptionId,
        });
      }

      // Then cancel in database
      await cancelSubscription({
        subscriptionId,
        cancelReason: "admin_cancelled",
      });

      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-2 border-red-500 bg-black">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Cancel Subscription?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently cancel the
            subscription and release all future booking slots. Past bookings
            will be preserved for records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancel}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {loading ? "Cancelling..." : "Yes, Cancel Subscription"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
