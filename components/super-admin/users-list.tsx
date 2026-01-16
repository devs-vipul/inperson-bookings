"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, UserCog } from "lucide-react";

type UserDoc = Doc<"users">;

export function UsersList() {
  const users = useQuery(api.users.getAll) as UserDoc[] | undefined;

  const getRoleBadge = (role: string | undefined) => {
    const roleValue = role || "user";
    
    if (roleValue === "super_admin") {
      return (
        <Badge
          className="text-xs font-bold"
          style={{
            backgroundColor: "#F2D578",
            color: "#000000",
          }}
        >
          <Shield className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    } else if (roleValue === "trainer") {
      return (
        <Badge
          className="text-xs font-bold"
          style={{
            backgroundColor: "#3b82f6",
            color: "#ffffff",
          }}
        >
          <UserCog className="h-3 w-3 mr-1" />
          Trainer
        </Badge>
      );
    } else {
      return (
        <Badge
          className="text-xs font-bold"
          style={{
            backgroundColor: "#6b7280",
            color: "#ffffff",
          }}
        >
          <User className="h-3 w-3 mr-1" />
          User
        </Badge>
      );
    }
  };


  if (users === undefined) {
    return (
      <Card className="border-2" style={{ borderColor: "#F2D578" }}>
        <CardHeader>
          <CardTitle
            className="text-2xl border-b-2 pb-3"
            style={{ borderColor: "#F2D578", color: "#F2D578" }}
          >
            All Users
          </CardTitle>
          <CardDescription>
            View and manage all users in the system
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
          <CardTitle
            className="text-2xl border-b-2 pb-3"
            style={{ borderColor: "#F2D578", color: "#F2D578" }}
          >
            All Users
          </CardTitle>
          <CardDescription>
            View all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#F2D578" }}>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      S.No
                    </th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      Name
                    </th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      Email
                    </th>
                    <th className="text-left p-4 font-bold" style={{ color: "#F2D578" }}>
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    return (
                      <tr
                        key={user._id}
                        className="border-b hover:bg-muted/50 transition-all"
                        style={{ borderColor: "rgba(242, 213, 120, 0.2)" }}
                      >
                        <td className="p-4 font-medium">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          {user.name || "N/A"}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {user.email || "N/A"}
                        </td>
                        <td className="p-4">
                          {getRoleBadge(user.role)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
