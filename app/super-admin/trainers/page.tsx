"use client";

import { useState } from "react";
import { CreateTrainerForm } from "@/components/super-admin/create-trainer-form";
import { TrainersList } from "@/components/super-admin/trainers-list";

export default function TrainersPage() {
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-3xl font-bold tracking-tight"
          style={{ color: "#F2D578" }}
        >
          Trainers
        </h2>
        <p className="text-muted-foreground">
          Manage trainers and their information
        </p>
      </div>

      {/* Custom Tabs */}
      <div className="space-y-6">
        <div
          className="w-full md:w-fit grid grid-cols-2 border-b-2"
          style={{ borderColor: "#F2D578" }}
        >
          <button
            onClick={() => setActiveTab("create")}
            style={{
              backgroundColor: activeTab === "create" ? "#F2D578" : "#000000",
              color: activeTab === "create" ? "#000000" : "#F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all"
          >
            Create Trainer
          </button>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              backgroundColor: activeTab === "list" ? "#F2D578" : "#000000",
              color: activeTab === "list" ? "#000000" : "#F2D578",
              border: "2px solid #F2D578",
            }}
            className="py-3 px-6 text-base font-bold transition-all"
          >
            Trainers
          </button>
        </div>

        {activeTab === "create" && (
          <div className="space-y-4">
            <CreateTrainerForm />
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-4">
            <TrainersList />
          </div>
        )}
      </div>
    </div>
  );
}
