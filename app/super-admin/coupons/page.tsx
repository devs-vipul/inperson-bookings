"use client";

import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { CreateCouponForm } from "@/components/super-admin/create-coupon-form";
import { CouponsTable } from "@/components/super-admin/coupons-table";

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState<"create" | "list" | "archived">(
    "list"
  );

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

      {/* Custom Tabs (match Trainers page styling) */}
      <div className="space-y-6">
        <div
          className="w-full md:w-fit grid grid-cols-3 border-b-2"
          style={{ borderColor: "#F2D578" }}
        >
          <button
            onClick={() => setActiveTab("create")}
            style={{
              backgroundColor: activeTab === "create" ? "#F2D578" : "#000000",
              color: activeTab === "create" ? "#000000" : "#F2D578",
              border: "2px solid #F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Coupon
          </button>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              backgroundColor: activeTab === "list" ? "#F2D578" : "#000000",
              color: activeTab === "list" ? "#000000" : "#F2D578",
              border: "2px solid #F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all flex items-center justify-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Coupons
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            style={{
              backgroundColor: activeTab === "archived" ? "#F2D578" : "#000000",
              color: activeTab === "archived" ? "#000000" : "#F2D578",
              border: "2px solid #F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all"
          >
            Archived Coupons
          </button>
        </div>

        {activeTab === "create" && (
          <div className="space-y-4">
            <CreateCouponForm />
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-4">
            <CouponsTable />
          </div>
        )}

        {activeTab === "archived" && (
          <div className="space-y-4">
            <CouponsTable archivedOnly />
          </div>
        )}
      </div>
    </div>
  );
}
