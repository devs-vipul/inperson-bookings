"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Fetch user role from Convex
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const isSuperAdmin = convexUser?.role === "super_admin";
  const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
  const userInitials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || userEmail[0]?.toUpperCase() || "U";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Show loading skeleton while fetching role
  if (user && convexUser === undefined) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border-2 p-1 transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          style={{ borderColor: "#F2D578" }}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback
              className="text-xs font-bold"
              style={{
                backgroundColor: "#F2D578",
                color: "#000000",
              }}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-2 bg-black rounded-lg"
        style={{ borderColor: "#F2D578" }}
      >
        {/* Email */}
        <DropdownMenuItem
          className="cursor-default text-white focus:bg-transparent"
          disabled
        >
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-sm font-medium truncate">{userEmail || "No email"}</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Admin Panel - Only for super admins */}
        {isSuperAdmin && (
          <>
            <DropdownMenuItem
              asChild
              className="cursor-pointer text-white hover:bg-white/10 focus:bg-white/10"
            >
              <Link href="/super-admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" style={{ color: "#F2D578" }} />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
          </>
        )}

        {/* Log out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-white hover:bg-red-500/20 focus:bg-red-500/20"
        >
          <LogOut className="h-4 w-4 mr-2 text-red-400" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
