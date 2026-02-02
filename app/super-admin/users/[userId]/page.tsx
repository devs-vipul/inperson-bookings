"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Shield, User, UserCog } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function UserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  // Try to get by ID first (userId is the Convex ID)
  const userById = useQuery(api.users.getById, {
    userId: userId as Id<"users">,
  });

  const actualUser = userById;

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

  if (actualUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!actualUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="border-2" style={{ borderColor: "#F2D578" }}>
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-bold text-lg mb-4">
              User not found
            </p>
            <Button
              asChild
              className="px-6 py-4 font-bold rounded-lg border-2"
              style={{
                backgroundColor: "#F2D578",
                color: "black",
                borderColor: "#F2D578",
              }}
            >
              <Link href="/super-admin/users">Go to Users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <Link href="/super-admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#F2D578" }}>
                User Details
              </h1>
              <p className="text-muted-foreground mt-1">
                View detailed information about the user
              </p>
            </div>
          </div>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2" style={{ borderColor: "#F2D578" }}>
            <CardHeader>
              <CardTitle style={{ color: "#F2D578" }}>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name and Role */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {actualUser.name || "Unknown User"}
                  </h2>
                  <div className="mt-2">
                    {getRoleBadge(actualUser.role)}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5" style={{ color: "#F2D578" }} />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{actualUser.email || "N/A"}</p>
                  </div>
                </div>

                {actualUser.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5" style={{ color: "#F2D578" }} />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{actualUser.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5" style={{ color: "#F2D578" }} />
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium text-xs font-mono">
                      {actualUser._id}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
