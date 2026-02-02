"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";

const monthlyProductFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().min(0, "Price must be 0 or greater"),
  durationMonths: z.number().int().positive("Duration must be a positive integer"),
});

type MonthlyProductFormValues = z.infer<typeof monthlyProductFormSchema>;

export function CreateMonthlyProductForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<MonthlyProductFormValues>({
    resolver: zodResolver(monthlyProductFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 100,
      durationMonths: 1,
    },
  });

  const onSubmit = async (data: MonthlyProductFormValues) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/monthly-products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price,
          durationMonths: data.durationMonths,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create monthly product");
      }

      toast({
        variant: "default",
        title: "Success",
        description: "Monthly product created successfully!",
      });

      form.reset();
      // Trigger a refresh of the products list
      window.location.reload();
    } catch (error) {
      console.error("Error creating monthly product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create monthly product. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border-2 p-6" style={{ borderColor: "#F2D578" }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: "#F2D578" }}>
        Create New Monthly Product
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Monthly Access - Basic" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive name for this monthly subscription product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Unlock all trainers for 1 month. Book unlimited sessions with any trainer!"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Describe what users get with this subscription
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="100.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Price in US dollars (e.g., 100.00 or 0.00 for free)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    How many months the subscription lasts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            style={{
              backgroundColor: "#F2D578",
              color: "#000000",
            }}
          >
            {isLoading ? "Creating..." : "Create Product"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
