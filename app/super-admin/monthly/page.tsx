"use client";

import { useState } from "react";
import { Plus, Calendar, Archive } from "lucide-react";
import { CreateMonthlyProductForm } from "@/components/super-admin/create-monthly-product-form";
import { MonthlyProductsTable } from "@/components/super-admin/monthly-products-table";

export default function MonthlyPage() {
  const [activeTab, setActiveTab] = useState<"create" | "list" | "archived">(
    "list"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#F2D578" }}>
            Monthly Subscriptions
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage monthly subscription products for trainer access
          </p>
        </div>
      </div>

      {/* Custom Tabs */}
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
            Create Product
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
            <Calendar className="h-4 w-4" />
            Products
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            style={{
              backgroundColor: activeTab === "archived" ? "#F2D578" : "#000000",
              color: activeTab === "archived" ? "#000000" : "#F2D578",
              border: "2px solid #F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all flex items-center justify-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Archived
          </button>
        </div>

        {activeTab === "create" && (
          <div className="space-y-4">
            <CreateMonthlyProductForm />
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-4">
            <MonthlyProductsTable />
          </div>
        )}

        {activeTab === "archived" && (
          <div className="space-y-4">
            <MonthlyProductsTable archivedOnly />
          </div>
        )}
      </div>
    </div>
  );
}
