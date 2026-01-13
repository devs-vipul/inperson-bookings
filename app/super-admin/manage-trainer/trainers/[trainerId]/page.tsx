"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TrainerImage } from "@/components/trainer-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Eye, Archive, Calendar, Edit } from "lucide-react";
import { CreateSessionDialog } from "@/components/super-admin/create-session-dialog";
import { EditAvailabilityDialog } from "@/components/super-admin/edit-availability-dialog";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";

export default function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] =
    useState(false);
  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const sessions = useQuery(api.sessions.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });

  const toggleSlot = useMutation(api.availability.toggleSlot);
  const { toast } = useToast();

  if (
    trainer === undefined ||
    sessions === undefined ||
    availability === undefined
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (trainer === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Trainer not found</p>
      </div>
    );
  }

  const sessions30Min = sessions?.filter((s) => s.duration === 30) || [];
  const sessions60Min = sessions?.filter((s) => s.duration === 60) || [];

  return (
    <div className="space-y-6">
      {/* Top Section - Trainer Profile */}
      <Card className="bg-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <TrainerImage
                storageId={trainer.profilePicture}
                alt={trainer.name}
                width={120}
                height={120}
                className="rounded-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{trainer.name}</h1>
              <p className="text-muted-foreground mt-1">{trainer.phone}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Trainer Profile
              </Button>
              <CreateSessionDialog trainerId={trainer._id} />
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Bookings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trainer Email */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Trainer Email
              </h3>
              <p className="text-lg">{trainer.email}</p>
            </div>
            <Button variant="destructive" size="sm">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trainer Description */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Trainer Description
          </h3>
          <p className="text-sm">
            {trainer.description ||
              "No description available for this trainer."}
          </p>
        </CardContent>
      </Card>

      {/* Availability Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAvailabilityDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Availability
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/super-admin/manage-trainer/trainers/${trainerId}/calendar`}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Manage Slots
              </Link>
            </Button>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Available Days & Timing
          </h3>
          {availability && availability.length > 0 ? (
            <div className="space-y-3">
              {availability.map((avail) => (
                <div
                  key={avail._id}
                  className="rounded-lg border bg-muted/50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{avail.day}</h4>
                    <Switch
                      checked={avail.isActive}
                      onCheckedChange={async (checked) => {
                        try {
                          await toggleSlot({
                            id: avail._id,
                            isActive: checked,
                          });
                          toast({
                            variant: "success",
                            title: "Success",
                            description: `${avail.day} availability ${checked ? "enabled" : "disabled"}`,
                          });
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Failed to update availability",
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    {avail.timeSlots.map((slot, index) => {
                      const formatTime = (time24h: string): string => {
                        const [hours, minutes] = time24h.split(":");
                        const hour24 = parseInt(hours);
                        const hour12 =
                          hour24 === 0
                            ? 12
                            : hour24 > 12
                              ? hour24 - 12
                              : hour24;
                        const period = hour24 >= 12 ? "PM" : "AM";
                        return `${hour12}:${minutes} ${period}`;
                      };
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span>{formatTime(slot.from)}</span>
                          <span>-</span>
                          <span>{formatTime(slot.to)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No availability set. Click "Edit Availability" to add.
            </p>
          )}
        </CardContent>
      </Card>

      {trainer && (
        <EditAvailabilityDialog
          trainerId={trainer._id}
          open={isAvailabilityDialogOpen}
          onOpenChange={setIsAvailabilityDialogOpen}
        />
      )}

      {/* Sessions Section */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="30_mint" className="w-full">
            <TabsList>
              <TabsTrigger value="30_mint">30 Minutes Session</TabsTrigger>
              <TabsTrigger value="60_mint">60 Minutes Session</TabsTrigger>
            </TabsList>
            <TabsContent value="30_mint" className="mt-6">
              {sessions30Min.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No 30-minute sessions created yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {sessions30Min.map((session) => (
                    <Card key={session._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                            {session.duration} minutes
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">
                          {session.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {session.description}
                        </p>
                        <p className="text-2xl font-bold mb-2">
                          ${session.price}{" "}
                          <span className="text-sm">/ week</span>
                        </p>
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          {session.sessionsPerWeek} session
                          {session.sessionsPerWeek > 1 ? "s" : ""} / week
                        </p>
                        <p className="text-xs text-center text-muted-foreground">
                          Recurring subscription
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="60_mint" className="mt-6">
              {sessions60Min.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No 60-minute sessions created yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {sessions60Min.map((session) => (
                    <Card key={session._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                            {session.duration} minutes
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">
                          {session.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {session.description}
                        </p>
                        <p className="text-2xl font-bold mb-2">
                          ${session.price}{" "}
                          <span className="text-sm">/ week</span>
                        </p>
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          {session.sessionsPerWeek} session
                          {session.sessionsPerWeek > 1 ? "s" : ""} / week
                        </p>
                        <p className="text-xs text-center text-muted-foreground">
                          Recurring subscription
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
