"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTrainerForm } from "@/components/super-admin/create-trainer-form";
import { TrainersList } from "@/components/super-admin/trainers-list";

export default function TrainersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trainers</h2>
        <p className="text-muted-foreground">
          Manage trainers and their information
        </p>
      </div>
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Trainer</TabsTrigger>
          <TabsTrigger value="list">Trainers</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="space-y-4">
          <CreateTrainerForm />
        </TabsContent>
        <TabsContent value="list" className="space-y-4">
          <TrainersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
