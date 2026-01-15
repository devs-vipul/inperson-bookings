"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface PauseSubscriptionDialogProps {
  subscriptionId: Id<"subscriptions">;
  stripeSubscriptionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PauseSubscriptionDialog({
  subscriptionId,
  stripeSubscriptionId,
  open,
  onOpenChange,
}: PauseSubscriptionDialogProps) {
  const [resumeDate, setResumeDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const pauseSubscription = useMutation(api.subscriptions.pause);
  const pauseInStripe = useAction(api.subscriptions.pauseInStripe);

  const handleSubmit = async () => {
    if (!resumeDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a resume date",
      });
      return;
    }

    setLoading(true);
    try {
      // Set time to end of day UTC
      const endOfDayUTC = new Date(
        Date.UTC(
          resumeDate.getFullYear(),
          resumeDate.getMonth(),
          resumeDate.getDate(),
          23,
          59,
          59
        )
      );

      // Pause in Stripe FIRST (only if stripeSubscriptionId is provided)
      if (stripeSubscriptionId) {
        await pauseInStripe({
          stripeSubscriptionId,
          resumeDate: endOfDayUTC.toISOString(),
        });
      }

      // Then pause in database
      await pauseSubscription({
        subscriptionId,
        resumeDate: endOfDayUTC.toISOString(),
      });

      toast({
        title: "Success",
        description: `Subscription paused until ${format(resumeDate, "PPP")}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error pausing subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to pause subscription. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-2 bg-black"
        style={{ borderColor: "#F2D578" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#F2D578" }}>
            Pause Subscription
          </DialogTitle>
          <DialogDescription>
            Please select when the subscription should resume.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Subscription Resume Date
            </label>
            <Calendar
              mode="single"
              selected={resumeDate}
              onSelect={setResumeDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border-2"
              style={{ borderColor: "#F2D578" }}
            />
          </div>

          {resumeDate && (
            <div
              className="p-3 rounded-lg border-2"
              style={{
                borderColor: "#F2D578",
                backgroundColor: "rgba(242, 213, 120, 0.1)",
              }}
            >
              <p className="text-sm font-medium">
                Selected Date:{" "}
                <span style={{ color: "#F2D578" }}>
                  {format(resumeDate, "PPP")}
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!resumeDate || loading}
              className="font-bold"
              style={{
                backgroundColor: resumeDate ? "#F2D578" : undefined,
                color: resumeDate ? "black" : undefined,
              }}
            >
              {loading ? "Pausing..." : "Pause Subscription"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
