"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const couponFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  disc_type: z.enum(["percentage", "flat"]),
  add_disc: z.number().int().positive("Discount must be positive"),
  validity: z.number().int().positive("Validity must be positive"),
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

export function CreateCouponForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      name: "",
      code: "",
      disc_type: "percentage",
      add_disc: 0,
      validity: 1,
    },
  });

  const onSubmit = async (data: CouponFormValues) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Validate percentage discount
      if (data.disc_type === "percentage" && (data.add_disc < 1 || data.add_disc > 100)) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Percentage discount must be between 1 and 100",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/stripe/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          code: data.code,
          disc_type: data.disc_type,
          add_disc: data.add_disc,
          validity: data.validity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create coupon");
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Coupon created successfully!",
      });

      form.reset();
      // Trigger a refresh of the coupons list (parent component should handle this)
      window.location.reload();
    } catch (error) {
      console.error("Error creating coupon:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create coupon. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border-2 p-6" style={{ borderColor: "#F2D578" }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: "#F2D578" }}>
        Create New Coupon
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coupon Name</FormLabel>
                <FormControl>
                  <Input placeholder="Summer Sale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coupon Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="SUMMER2024"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>
                  Code will be automatically converted to uppercase
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disc_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-black border-2" style={{ borderColor: "#F2D578" }}>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="add_disc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch("disc_type") === "percentage"
                    ? "Discount Percentage"
                    : "Discount Amount ($)"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={
                      form.watch("disc_type") === "percentage" ? "10" : "50"
                    }
                    {...field}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!isNaN(value)) field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {form.watch("disc_type") === "percentage"
                    ? "Enter percentage (1-100)"
                    : "Enter amount in dollars"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Validity (Months)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="3"
                    {...field}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!isNaN(value)) field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  How many months the coupon will be valid
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Coupon
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
