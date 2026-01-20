"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Ticket } from "lucide-react";

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#F2D578" }}>
            Coupons
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage discount coupons for your training sessions
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Coupon
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Coupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <div className="rounded-lg border-2 p-6" style={{ borderColor: "#F2D578" }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#F2D578" }}>
              Create New Coupon
            </h2>
            <p className="text-muted-foreground">
              Coupon creation form will be implemented here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="rounded-lg border-2 p-6" style={{ borderColor: "#F2D578" }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#F2D578" }}>
              All Coupons
            </h2>
            <p className="text-muted-foreground">
              Coupons list will be displayed here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
