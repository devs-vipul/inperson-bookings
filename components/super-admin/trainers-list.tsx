"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Trainer = Doc<"trainers">;

export function TrainersList() {
  const trainers = useQuery(api.trainers.getAll) as Trainer[] | undefined;
  const updateStatus = useMutation(api.trainers.updateStatus);
  const { toast } = useToast();

  const handleStatusToggle = async (
    trainerId: Id<"trainers">,
    currentStatus: boolean
  ) => {
    try {
      await updateStatus({
        id: trainerId,
        status: !currentStatus,
      });
      toast({
        variant: "success",
        title: "Success",
        description: `Trainer ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update trainer status",
      });
    }
  };

  if (trainers === undefined) {
    return (
      <Card className="border-2" style={{ borderColor: "#F2D578" }}>
        <CardHeader>
          <CardTitle className="text-2xl border-b-2 pb-3" style={{ borderColor: "#F2D578", color: "#F2D578" }}>
            All Trainers
          </CardTitle>
          <CardDescription>
            View and manage all trainers in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2" style={{ borderColor: "#F2D578" }}>
        <CardHeader>
          <CardTitle className="text-2xl border-b-2 pb-3" style={{ borderColor: "#F2D578", color: "#F2D578" }}>
            All Trainers
          </CardTitle>
          <CardDescription>
            View and manage all trainers in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No trainers found. Create your first trainer to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#F2D578" }}>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>S.No</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      Trainer Name
                    </th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Email</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Phone</th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      Available Days
                    </th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((trainer, index) => (
                    <tr
                      key={trainer._id}
                      className="border-b hover:bg-muted/50 transition-all"
                      style={{ borderColor: "rgba(242, 213, 120, 0.2)" }}
                    >
                      <td className="p-4 font-medium">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="p-4 font-bold text-foreground">{trainer.name}</td>
                      <td className="p-4 text-muted-foreground">
                        {trainer.email}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {trainer.phone}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {trainer.availableDays &&
                          trainer.availableDays.length > 0 ? (
                            trainer.availableDays.map(
                              (day: string, dayIndex: number) => (
                                <span
                                  key={dayIndex}
                                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold"
                                  style={{
                                    backgroundColor: "rgba(242, 213, 120, 0.2)",
                                    color: "#F2D578",
                                    border: "1px solid #F2D578",
                                  }}
                                >
                                  {day}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No days set
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={trainer.status}
                            onCheckedChange={() =>
                              handleStatusToggle(trainer._id, trainer.status)
                            }
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-black border-2"
                              style={{ borderColor: "#F2D578" }}
                            >
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/super-admin/manage-trainer/trainers/${trainer._id}`}
                                  className="cursor-pointer font-medium"
                                  style={{ color: "#F2D578" }}
                                >
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
