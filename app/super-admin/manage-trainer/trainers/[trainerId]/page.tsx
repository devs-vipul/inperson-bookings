"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TrainerImage } from "@/components/trainer-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pencil,
  Plus,
  Eye,
  Archive,
  Calendar,
  Edit,
  MoreVertical,
} from "lucide-react";
import { CreateSessionDialog } from "@/components/super-admin/create-session-dialog";
import { EditAvailabilityDialog } from "@/components/super-admin/edit-availability-dialog";
import { EditSessionDialog } from "@/components/super-admin/edit-session-dialog";
import { PauseSubscriptionDialog } from "@/components/super-admin/pause-subscription-dialog";
import { CancelSubscriptionAlert } from "@/components/super-admin/cancel-subscription-alert";
import { EditResumeDateDialog } from "@/components/super-admin/edit-resume-date-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
  const [activeSessionTab, setActiveSessionTab] = useState<
    "30" | "60" | "archived"
  >("30");
  const [selectedSubscription, setSelectedSubscription] = useState<any | null>(
    null
  );
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isEditResumeDateOpen, setIsEditResumeDateOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [archivingSessionId, setArchivingSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [deletingSessionId, setDeletingSessionId] =
    useState<Id<"sessions"> | null>(null);
  const [isArchiveTrainerOpen, setIsArchiveTrainerOpen] = useState(false);
  const [resumingSubscriptionId, setResumingSubscriptionId] = useState<Id<"subscriptions"> | null>(null);

  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const sessions = useQuery(api.sessions.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const archivedSessions = useQuery(api.sessions.getArchivedByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const availability = useQuery(api.availability.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });
  const subscriptions = useQuery(api.subscriptions.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });

  const toggleSlot = useMutation(api.availability.toggleSlot);
  const resumeSubscription = useMutation(api.subscriptions.resume);
  const resumeInStripe = useAction(api.subscriptions.resumeInStripe);
  const archiveSession = useMutation(api.sessions.archive);
  const unarchiveSession = useMutation(api.sessions.unarchive);
  const deleteSession = useMutation(api.sessions.remove);
  const archiveTrainer = useMutation(api.trainers.archive);
  const { toast } = useToast();

  if (
    trainer === undefined ||
    sessions === undefined ||
    availability === undefined ||
    subscriptions === undefined
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

  const handleResumeInstantly = async (subscription: any) => {
    setResumingSubscriptionId(subscription._id);
    try {
      // First resume in Stripe
      await resumeInStripe({
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      });

      // Then update our database
      await resumeSubscription({ subscriptionId: subscription._id });

      toast({
        title: "Success",
        description: "Subscription resumed instantly",
      });
    } catch (error) {
      console.error("Error resuming subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resume subscription",
      });
    } finally {
      setResumingSubscriptionId(null);
    }
  };

  const handleArchiveSession = async (sessionId: Id<"sessions">) => {
    setArchivingSessionId(sessionId);
    try {
      await archiveSession({ id: sessionId });
      toast({
        title: "Success",
        description: "Session archived successfully",
      });
      setArchivingSessionId(null);
    } catch (error) {
      console.error("Error archiving session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive session",
      });
      setArchivingSessionId(null);
    }
  };

  const handleUnarchiveSession = async (sessionId: Id<"sessions">) => {
    setArchivingSessionId(sessionId);
    try {
      await unarchiveSession({ id: sessionId });
      toast({
        title: "Success",
        description: "Session unarchived successfully",
      });
    } catch (error) {
      console.error("Error unarchiving session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unarchive session",
      });
    } finally {
      setArchivingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: Id<"sessions">) => {
    setDeletingSessionId(sessionId);
    try {
      await deleteSession({ id: sessionId });
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      setDeletingSessionId(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete session",
      });
      setDeletingSessionId(null);
    }
  };

  const handleArchiveTrainer = async () => {
    try {
      await archiveTrainer({ id: trainerId as Id<"trainers"> });
      toast({
        title: "Success",
        description: "Trainer archived successfully",
      });
      setIsArchiveTrainerOpen(false);
      // Redirect to trainers list
      window.location.href = "/super-admin/trainers";
    } catch (error) {
      console.error("Error archiving trainer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive trainer",
      });
    }
  };

  const formatDate = (dateInput: number | string) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#22c55e", text: "#000000" };
      case "paused":
        return { bg: "#eab308", text: "#000000" };
      case "past_due":
        return { bg: "#f97316", text: "#ffffff" };
      case "cancelled":
        return { bg: "#ef4444", text: "#ffffff" };
      default:
        return { bg: "#6b7280", text: "#ffffff" };
    }
  };

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
                onClick={() => setIsArchiveTrainerOpen(true)}
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
              className="w-full md:w-fit grid grid-cols-3 border-b-2"
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
              <button
                onClick={() => setActiveSessionTab("archived")}
                style={{
                  backgroundColor:
                    activeSessionTab === "archived" ? "#F2D578" : "#000000",
                  color:
                    activeSessionTab === "archived" ? "#000000" : "#F2D578",
                  border: "2px solid #F2D578",
                }}
                className="py-3 px-6 text-base font-bold transition-all"
              >
                Archived
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 font-bold border-2"
                                style={{
                                  backgroundColor: "#F2D578",
                                  color: "#000000",
                                  borderColor: "#F2D578",
                                }}
                                onClick={() => setEditingSessionId(session._id)}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-2"
                                    style={{
                                      borderColor: "#F2D578",
                                      color: "#F2D578",
                                    }}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="bg-black border-2"
                                  style={{ borderColor: "#F2D578" }}
                                >
                                  <DropdownMenuItem
                                    className="text-white hover:bg-yellow-500/20 hover:text-yellow-500"
                                    onClick={() =>
                                      setArchivingSessionId(session._id)
                                    }
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500 hover:bg-red-500/20"
                                    onClick={() =>
                                      setDeletingSessionId(session._id)
                                    }
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 font-bold border-2"
                                style={{
                                  backgroundColor: "#F2D578",
                                  color: "#000000",
                                  borderColor: "#F2D578",
                                }}
                                onClick={() => setEditingSessionId(session._id)}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-2"
                                    style={{
                                      borderColor: "#F2D578",
                                      color: "#F2D578",
                                    }}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="bg-black border-2"
                                  style={{ borderColor: "#F2D578" }}
                                >
                                  <DropdownMenuItem
                                    className="text-white hover:bg-yellow-500/20 hover:text-yellow-500"
                                    onClick={() =>
                                      setArchivingSessionId(session._id)
                                    }
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500 hover:bg-red-500/20"
                                    onClick={() =>
                                      setDeletingSessionId(session._id)
                                    }
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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

            {activeSessionTab === "archived" && (
              <div className="mt-6">
                {archivedSessions === undefined ? (
                  <p className="text-center text-muted-foreground py-8">
                    Loading archived sessions...
                  </p>
                ) : archivedSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No archived sessions.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {archivedSessions.map((session, idx) => (
                      <motion.div
                        key={session._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <Card
                          className="border-0 hover:shadow-xl transition-all opacity-75"
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
                              <Badge
                                className="text-xs font-bold"
                                style={{
                                  backgroundColor: "#666",
                                  color: "#fff",
                                }}
                              >
                                ARCHIVED
                              </Badge>
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 font-bold border-2"
                                style={{
                                  backgroundColor: "#F2D578",
                                  color: "#000000",
                                  borderColor: "#F2D578",
                                }}
                                onClick={() =>
                                  handleUnarchiveSession(session._id)
                                }
                                disabled={archivingSessionId === session._id}
                              >
                                <Archive className="h-3 w-3 mr-2" />
                                {archivingSessionId === session._id ? "Unarchiving..." : "Unarchive"}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-2"
                                    style={{
                                      borderColor: "#F2D578",
                                      color: "#F2D578",
                                    }}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  className="bg-black border-2"
                                  style={{ borderColor: "#F2D578" }}
                                >
                                  <DropdownMenuItem
                                    className="text-white hover:bg-yellow-500/20 hover:text-yellow-500"
                                    onClick={() =>
                                      setEditingSessionId(session._id)
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500 hover:bg-red-500/20"
                                    onClick={() =>
                                      setDeletingSessionId(session._id)
                                    }
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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

      {/* Booked Sessions Section */}
      <Card className="border-2 bg-black" style={{ borderColor: "#F2D578" }}>
        <CardContent className="p-6">
          <h3
            className="text-xl font-bold mb-4"
            style={{ color: "#F2D578", borderBottom: "2px solid #F2D578" }}
          >
            Booked Sessions
          </h3>

          {subscriptions && subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#F2D578" }}>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      User
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Email
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Package
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Sessions/Week
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Period Start
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Period End
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Status
                    </th>
                    <th
                      className="text-left py-3 px-4 font-bold text-sm"
                      style={{ color: "#F2D578" }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription: any, idx: number) => {
                    const statusColor = getStatusBadgeColor(
                      subscription.status
                    );
                    return (
                      <motion.tr
                        key={subscription._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="border-b border-white/10 hover:bg-white/5"
                      >
                        <td className="py-3 px-4 text-sm text-white">
                          {subscription.user?.name || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          {subscription.user?.email || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          <div>
                            <p className="font-medium">
                              {subscription.session?.name || "N/A"}
                            </p>
                            <p className="text-xs text-white/50">
                              {subscription.session?.duration} min
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          {subscription.sessionsPerWeek}
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          {formatDate(subscription.currentPeriodStart)}
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          <div>
                            <p>{formatDate(subscription.currentPeriodEnd)}</p>
                            {subscription.status === "paused" &&
                              subscription.resumeDate && (
                                <p className="text-xs text-yellow-400 mt-1">
                                  Resume:{" "}
                                  {new Date(
                                    subscription.resumeDate
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className="text-xs font-bold"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                            }}
                          >
                            {subscription.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-white/10"
                              >
                                <MoreVertical
                                  className="h-4 w-4"
                                  style={{ color: "#F2D578" }}
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-64 bg-black border-2"
                              style={{ borderColor: "#F2D578" }}
                            >
                              {subscription.status === "active" && (
                                <DropdownMenuItem
                                  className="text-white hover:bg-white/10 cursor-pointer"
                                  onClick={() => {
                                    setSelectedSubscription(subscription);
                                    setIsPauseDialogOpen(true);
                                  }}
                                >
                                  <span style={{ color: "#F2D578" }}>▐▐</span>
                                  <span className="ml-2">
                                    Pause Subscription
                                  </span>
                                </DropdownMenuItem>
                              )}

                              {subscription.status === "paused" && (
                                <>
                                  <DropdownMenuItem
                                    className="text-white hover:bg-white/10 cursor-pointer"
                                    onClick={() =>
                                      handleResumeInstantly(subscription)
                                    }
                                    disabled={resumingSubscriptionId === subscription._id}
                                  >
                                    <span style={{ color: "#F2D578" }}>▶</span>
                                    <span className="ml-2">
                                      {resumingSubscriptionId === subscription._id ? "Resuming..." : "Resume Subscription Instantly"}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-white hover:bg-white/10 cursor-pointer"
                                    onClick={() => {
                                      setSelectedSubscription(subscription);
                                      setIsEditResumeDateOpen(true);
                                    }}
                                  >
                                    <span style={{ color: "#F2D578" }}>✎</span>
                                    <span className="ml-2">
                                      Edit Resume Date
                                    </span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {(subscription.status === "active" ||
                                subscription.status === "paused") && (
                                <DropdownMenuItem
                                  className="text-red-500 hover:bg-red-500/10 cursor-pointer"
                                  onClick={() => {
                                    setSelectedSubscription(subscription);
                                    setIsCancelAlertOpen(true);
                                  }}
                                >
                                  <span>✕</span>
                                  <span className="ml-2">
                                    Cancel Subscription
                                  </span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No booked sessions yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedSubscription && (
        <>
          <PauseSubscriptionDialog
            subscriptionId={selectedSubscription._id}
            stripeSubscriptionId={selectedSubscription.stripeSubscriptionId}
            open={isPauseDialogOpen}
            onOpenChange={setIsPauseDialogOpen}
          />
          <CancelSubscriptionAlert
            subscriptionId={selectedSubscription._id}
            stripeSubscriptionId={selectedSubscription.stripeSubscriptionId}
            open={isCancelAlertOpen}
            onOpenChange={setIsCancelAlertOpen}
          />
          <EditResumeDateDialog
            subscriptionId={selectedSubscription._id}
            stripeSubscriptionId={selectedSubscription.stripeSubscriptionId}
            currentResumeDate={selectedSubscription.resumeDate}
            open={isEditResumeDateOpen}
            onOpenChange={setIsEditResumeDateOpen}
          />
        </>
      )}

      {/* Edit Session Dialog */}
      {editingSessionId && (
        <EditSessionDialog
          sessionId={editingSessionId}
          trainerId={trainerId as Id<"trainers">}
          open={!!editingSessionId}
          onOpenChange={(open) => !open && setEditingSessionId(null)}
        />
      )}

      {/* Archive Session Dialog */}
      {archivingSessionId && (
        <ArchiveSessionDialog
          sessionId={archivingSessionId}
          open={!!archivingSessionId}
          onOpenChange={(open) => !open && setArchivingSessionId(null)}
          onConfirm={handleArchiveSession}
        />
      )}

      {/* Delete Session Dialog */}
      {deletingSessionId && (
        <DeleteSessionDialog
          sessionId={deletingSessionId}
          open={!!deletingSessionId}
          onOpenChange={(open) => !open && setDeletingSessionId(null)}
          onConfirm={handleDeleteSession}
        />
      )}

      {/* Archive Trainer Dialog */}
      <AlertDialog
        open={isArchiveTrainerOpen}
        onOpenChange={setIsArchiveTrainerOpen}
      >
        <AlertDialogContent
          className="bg-black border-2"
          style={{ borderColor: "#F2D578" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Archive Trainer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This trainer will be archived and hidden from users. All existing
              sessions and subscriptions will remain active, but new bookings
              will be disabled. You can unarchive the trainer later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-2"
              style={{ borderColor: "#F2D578", color: "#F2D578" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveTrainer}
              className="font-bold border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "#000000",
                borderColor: "#F2D578",
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Trainer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Archive Session Dialog Component
function ArchiveSessionDialog({
  sessionId,
  open,
  onOpenChange,
  onConfirm,
}: {
  sessionId: Id<"sessions">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sessionId: Id<"sessions">) => void;
}) {
  const subscriptionData = useQuery(api.subscriptions.getBySessionId, {
    sessionId,
  });

  const activeCount = subscriptionData?.active ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-black border-2"
        style={{ borderColor: "#F2D578" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Archive Session
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            {activeCount > 0
              ? `This session has ${activeCount} active subscription(s). They will continue to work, but new users won't be able to subscribe to this session.`
              : "This session will be archived and hidden from users. You can restore it later if needed."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="border-2"
            style={{ borderColor: "#F2D578", color: "#F2D578" }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(sessionId)}
            className="font-bold border-2"
            style={{
              backgroundColor: "#F2D578",
              color: "#000000",
              borderColor: "#F2D578",
            }}
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Delete Session Dialog Component
function DeleteSessionDialog({
  sessionId,
  open,
  onOpenChange,
  onConfirm,
}: {
  sessionId: Id<"sessions">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sessionId: Id<"sessions">) => void;
}) {
  const subscriptionData = useQuery(api.subscriptions.getBySessionId, {
    sessionId,
  });

  const activeCount = subscriptionData?.active ?? 0;
  const totalCount = subscriptionData?.total ?? 0;
  const hasSubscriptions = totalCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-black border-2"
        style={{ borderColor: "#F2D578" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500">
            Delete Session
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            {hasSubscriptions
              ? `⚠️ Cannot delete: This session has ${activeCount} active subscription(s) and ${totalCount} total subscription(s). Please archive instead to preserve data.`
              : "⚠️ This action cannot be undone. This will permanently delete the session and all associated data."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="border-2"
            style={{ borderColor: "#F2D578", color: "#F2D578" }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(sessionId)}
            disabled={hasSubscriptions}
            className="font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: hasSubscriptions ? "#666" : "#ef4444",
              color: "#ffffff",
              borderColor: hasSubscriptions ? "#666" : "#ef4444",
            }}
          >
            {hasSubscriptions ? "Cannot Delete" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
