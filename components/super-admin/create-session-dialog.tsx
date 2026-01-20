"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function CreateSessionDialog({
  trainerId,
}: {
  trainerId: Id<"trainers">;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const createSession = useMutation(api.sessions.create);

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

  const onSubmit = async (data: SessionFormValues) => {
    if (isLoading) return; // Prevent multiple submissions
    setIsLoading(true);
    try {
      const sessionId = await createSession({
        trainerId,
        name: data.name,
        description: data.description,
        sessionsPerWeek: data.sessionsPerWeek,
        duration: data.duration,
        price: data.price,
      });

      // Create Stripe product and price for this session
      try {
        const trainer = await fetch(`/api/trainers/${trainerId}`).then((res) =>
          res.json()
        );

        await fetch("/api/stripe/create-product", {
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
          }),
        });
      } catch (stripeError) {
        // Log error but don't fail session creation
        console.error("Failed to create Stripe product:", stripeError);
        toast({
          variant: "default",
          title: "Warning",
          description: "Session created but Stripe product creation failed. It will be created when user books.",
        });
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Session created successfully!",
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create session. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="font-medium bg-white text-black border-0 hover:bg-white/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-black">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Create a new training session package for this trainer.
          </DialogDescription>
        </DialogHeader>
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
                    defaultValue={String(field.value)}
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
                    defaultValue={String(field.value)}
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
                  <FormDescription>Price per week in dollars</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
