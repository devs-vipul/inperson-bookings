"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TrainerImage } from "@/components/trainer-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Plus, Eye, Archive, Calendar, Edit } from "lucide-react";
import { CreateSessionDialog } from "@/components/super-admin/create-session-dialog";
import { EditAvailabilityDialog } from "@/components/super-admin/edit-availability-dialog";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

export default function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] =
    useState(false);
  const [activeSessionTab, setActiveSessionTab] = useState<"30" | "60">("30");

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          className="border-0"
          style={{
            backgroundColor: "#F2D578",
          }}
        >
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative rounded-lg shrink-0">
                <TrainerImage
                  storageId={trainer.profilePicture}
                  alt={trainer.name}
                  width={100}
                  height={100}
                  className="rounded-lg object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-black">
                  {trainer.name}{" "}
                  {trainer.status && (
                    <span className="text-lg">(Lead Trainer)</span>
                  )}
                </h1>
                <p className="text-black/70 mt-1 font-medium">
                  {trainer.phone}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  className="font-medium bg-white text-black border-0 hover:bg-white/90"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Trainer Profile
                </Button>
                <div>
                  <CreateSessionDialog trainerId={trainer._id} />
                </div>
                <Button
                  size="sm"
                  asChild
                  className="font-medium bg-white text-black border-0 hover:bg-white/90"
                >
                  <Link
                    href={`/super-admin/manage-trainer/trainers/${trainerId}/bookings`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Bookings
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email and Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trainer Email */}
        <Card className="border-0 bg-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-2">
                  Trainer Email
                </h3>
                <p className="text-base text-white">{trainer.email}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="font-medium"
                style={{
                  backgroundColor: "#dc2626",
                  color: "white",
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trainer Description */}
        <Card className="border-0 bg-black">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-white/70 mb-2">
              Trainer Description
            </h3>
            <p className="text-sm text-white leading-relaxed">
              {trainer.description ||
                "No description available for this trainer."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Availability Section */}
      <Card className="border-0 bg-black">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">
              Available Days & Timing
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsAvailabilityDialogOpen(true)}
                className="font-medium border-0"
                style={{
                  backgroundColor: "#F2D578",
                  color: "#000000",
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Availability
              </Button>
              <Button
                size="sm"
                asChild
                className="font-medium border-0"
                style={{
                  backgroundColor: "#F2D578",
                  color: "#000000",
                }}
              >
                <Link
                  href={`/super-admin/manage-trainer/trainers/${trainerId}/calendar`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Slots
                </Link>
              </Button>
            </div>
          </div>
          {availability && availability.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availability.map((avail, idx) => (
                <motion.div
                  key={avail._id}
                  className="rounded-lg border-0 p-4"
                  style={{
                    backgroundColor: "#2d3748",
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg text-white">
                      {avail.day}
                    </h4>
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
                  <div className="space-y-1">
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
                          className="flex items-center gap-2 text-sm text-white/70"
                        >
                          <span className="inline-flex items-center">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <circle cx="10" cy="10" r="2" />
                            </svg>
                            {formatTime(slot.from)}
                          </span>
                          <span>-</span>
                          <span>{formatTime(slot.to)}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
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
      <Card className="border-0 bg-black">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Custom Tabs */}
            <div
              className="w-full md:w-fit grid grid-cols-2 border-b-2"
              style={{ borderColor: "#F2D578" }}
            >
              <button
                onClick={() => setActiveSessionTab("30")}
                style={{
                  backgroundColor:
                    activeSessionTab === "30" ? "#F2D578" : "#000000",
                  color: activeSessionTab === "30" ? "#000000" : "#F2D578",
                  border: "2px solid #F2D578",
                }}
                className="py-3 px-6 text-base font-bold transition-all"
              >
                30 Minutes Session
              </button>
              <button
                onClick={() => setActiveSessionTab("60")}
                style={{
                  backgroundColor:
                    activeSessionTab === "60" ? "#F2D578" : "#000000",
                  color: activeSessionTab === "60" ? "#000000" : "#F2D578",
                  border: "2px solid #F2D578",
                }}
                className="py-3 px-6 text-base font-bold transition-all"
              >
                60 Minutes Session
              </button>
            </div>

            {activeSessionTab === "30" && (
              <div className="mt-6">
                {sessions30Min.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No 30-minute sessions created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sessions30Min.map((session, idx) => (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <Card
                          className="border-0 hover:shadow-xl transition-all"
                          style={{ backgroundColor: "#2d3748" }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span
                                className="text-xs font-bold px-2 py-1 rounded"
                                style={{
                                  backgroundColor: "rgba(242, 213, 120, 0.2)",
                                  color: "#F2D578",
                                  border: "1px solid #F2D578",
                                }}
                              >
                                {session.duration} minutes
                              </span>
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-white">
                              {session.name}
                            </h3>
                            <p className="text-xs text-white/70 mb-2">
                              {session.description}
                            </p>
                            <p className="text-2xl font-bold mb-3 text-white">
                              ${session.price}{" "}
                              <span className="text-sm">/ week</span>
                            </p>
                            <Button
                              size="sm"
                              className="w-full font-bold border-2"
                              style={{
                                backgroundColor: "#F2D578",
                                color: "#000000",
                                borderColor: "#F2D578",
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </Button>
                            <p className="text-xs text-center text-white/70 mt-2">
                              {session.sessionsPerWeek} session
                              {session.sessionsPerWeek > 1 ? "s" : ""} / week
                            </p>
                            <p className="text-xs text-center text-white/70">
                              Recurring subscription
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSessionTab === "60" && (
              <div className="mt-6">
                {sessions60Min.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No 60-minute sessions created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sessions60Min.map((session, idx) => (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <Card
                          className="border-0 hover:shadow-xl transition-all"
                          style={{ backgroundColor: "#2d3748" }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span
                                className="text-xs font-bold px-2 py-1 rounded"
                                style={{
                                  backgroundColor: "rgba(242, 213, 120, 0.2)",
                                  color: "#F2D578",
                                  border: "1px solid #F2D578",
                                }}
                              >
                                {session.duration} minutes
                              </span>
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-white">
                              {session.name}
                            </h3>
                            <p className="text-xs text-white/70 mb-2">
                              {session.description}
                            </p>
                            <p className="text-2xl font-bold mb-3 text-white">
                              ${session.price}{" "}
                              <span className="text-sm">/ week</span>
                            </p>
                            <Button
                              size="sm"
                              className="w-full font-bold border-2"
                              style={{
                                backgroundColor: "#F2D578",
                                color: "#000000",
                                borderColor: "#F2D578",
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </Button>
                            <p className="text-xs text-center text-white/70 mt-2">
                              {session.sessionsPerWeek} session
                              {session.sessionsPerWeek > 1 ? "s" : ""} / week
                            </p>
                            <p className="text-xs text-center text-white/70">
                              Recurring subscription
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
