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
      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
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
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">S.No</th>
                    <th className="text-left p-4 font-semibold">
                      Trainer Name
                    </th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Phone</th>
                    <th className="text-left p-4 font-semibold">
                      Available Days
                    </th>
                    <th className="text-left p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((trainer, index) => (
                    <tr
                      key={trainer._id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-4">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="p-4 font-medium">{trainer.name}</td>
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
                                  className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
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
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/super-admin/manage-trainer/trainers/${trainer._id}`}
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
