"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Edit, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const sessionFormSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  description: z.string().min(1, "Session description is required"),
  sessionsPerWeek: z.number().min(1).max(5),
  duration: z.number().refine((val) => val === 30 || val === 60, {
    message: "Duration must be 30 or 60 minutes",
  }),
  price: z.number().min(0, "Price must be 0 or greater"),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface EditSessionDialogProps {
  sessionId: Id<"sessions">;
  trainerId: Id<"trainers">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSessionDialog({
  sessionId,
  trainerId,
  open,
  onOpenChange,
}: EditSessionDialogProps) {
  const { toast } = useToast();
  const updateSession = useMutation(api.sessions.update);
  const session = useQuery(api.sessions.getById, { id: sessionId });
  const subscriptionData = useQuery(api.subscriptions.getBySessionId, {
    sessionId,
  });

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sessionsPerWeek: 1,
      duration: 30,
      price: 0,
    },
  });

  // Load session data when dialog opens
  useEffect(() => {
    if (session && open) {
      form.reset({
        name: session.name,
        description: session.description,
        sessionsPerWeek: session.sessionsPerWeek,
        duration: session.duration,
        price: session.price,
      });
    }
  }, [session, open, form]);

  const hasActiveSubscriptions = (subscriptionData?.active ?? 0) > 0;
  const activeCount = subscriptionData?.active ?? 0;

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: SessionFormValues) => {
    setIsLoading(true);
    try {
      // Check if critical fields changed and there are active subscriptions
      const criticalFieldsChanged =
        hasActiveSubscriptions &&
        (data.price !== session?.price ||
          data.sessionsPerWeek !== session?.sessionsPerWeek ||
          data.duration !== session?.duration);

      if (criticalFieldsChanged) {
        // Show warning but allow edit
        toast({
          variant: "default",
          title: "Warning",
          description: `This session has ${activeCount} active subscription(s). Changes to price, duration, or sessions per week will NOT affect existing subscriptions. Only new subscriptions will use the updated values.`,
        });
      }

      // Update session in database
      await updateSession({
        id: sessionId,
        name: data.name,
        description: data.description,
        sessionsPerWeek: data.sessionsPerWeek,
        duration: data.duration,
        price: data.price,
      });

      // Update Stripe product if it exists
      if (session?.stripeProductId && session?.stripePriceId) {
        try {
          const trainer = await fetch(`/api/trainers/${trainerId}`).then(
            (res) => res.json()
          );

          await fetch("/api/stripe/update-product", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
              trainerId,
              sessionName: data.name,
              description: data.description,
              sessionsPerWeek: data.sessionsPerWeek,
              duration: data.duration,
              price: data.price,
              trainerName: trainer?.name || "Trainer",
              stripeProductId: session.stripeProductId,
              stripePriceId: session.stripePriceId,
            }),
          });
        } catch (stripeError) {
          console.error("Failed to update Stripe product:", stripeError);
          toast({
            variant: "default",
            title: "Warning",
            description:
              "Session updated but Stripe product update failed. Existing subscriptions will continue to work.",
          });
        }
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Session updated successfully!",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update session. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-black border-2" style={{ borderColor: "#F2D578" }}>
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update the training session package details.
          </DialogDescription>
        </DialogHeader>

        {hasActiveSubscriptions && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              This session has <strong>{activeCount} active subscription(s)</strong>.
              Changes to price, duration, or sessions per week will NOT affect
              existing subscriptions. Only new subscriptions will use the updated
              values.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Session Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Desc</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Session Desc"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionsPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sessions per Week</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sessions per week" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-black border-2" style={{ borderColor: "#F2D578" }}>
                      <SelectItem value="1">1 session/week</SelectItem>
                      <SelectItem value="2">2 sessions/week</SelectItem>
                      <SelectItem value="3">3 sessions/week</SelectItem>
                      <SelectItem value="4">4 sessions/week</SelectItem>
                      <SelectItem value="5">5 sessions/week</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveSubscriptions && (
                    <FormDescription className="text-yellow-500">
                      Existing subscriptions will keep their current sessions per week
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Duration</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-black border-2" style={{ borderColor: "#F2D578" }}>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveSubscriptions && (
                    <FormDescription className="text-yellow-500">
                      Existing subscriptions will keep their current duration
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Price per week in dollars
                    {hasActiveSubscriptions && (
                      <span className="text-yellow-500 block mt-1">
                        Existing subscriptions will keep their current price
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-2"
                style={{ borderColor: "#F2D578", color: "#F2D578" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="font-bold border-2"
                style={{
                  backgroundColor: "#F2D578",
                  color: "#000000",
                  borderColor: "#F2D578",
                }}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Session
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
