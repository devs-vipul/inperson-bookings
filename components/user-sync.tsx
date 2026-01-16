"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

/**
 * Component that automatically syncs Clerk users to Convex database
 * Runs silently in the background when user is authenticated
 */
export function UserSync() {
  const { user } = useUser();
  const upsertUser = useMutation(api.users.upsertFromClerk);
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  useEffect(() => {
    // Only sync if user is logged in and doesn't exist in Convex yet
    if (user?.id && convexUser === null) {
      // User exists in Clerk but not in Convex - create them
      upsertUser({
        clerkUserId: user.id,
        name: user.fullName || undefined,
        email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || undefined,
        image: user.imageUrl || undefined,
        phone: user.primaryPhoneNumber?.phoneNumber || undefined,
      }).catch((error) => {
        // Silently fail - user will be created when they interact with features
        console.error("Failed to sync user:", error);
      });
    } else if (user?.id && convexUser) {
      // User exists in both - update Convex user if Clerk data changed
      const needsUpdate =
        convexUser.name !== (user.fullName || undefined) ||
        convexUser.email !== (user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || undefined) ||
        convexUser.image !== (user.imageUrl || undefined) ||
        convexUser.phone !== (user.primaryPhoneNumber?.phoneNumber || undefined);

      if (needsUpdate) {
        upsertUser({
          clerkUserId: user.id,
          name: user.fullName || undefined,
          email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || undefined,
          image: user.imageUrl || undefined,
          phone: user.primaryPhoneNumber?.phoneNumber || undefined,
        }).catch((error) => {
          console.error("Failed to update user:", error);
        });
      }
    }
  }, [user, convexUser, upsertUser]);

  // This component doesn't render anything
  return null;
}
