"use client";

import { UsersList } from "@/components/super-admin/users-list";

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-3xl font-bold tracking-tight"
          style={{ color: "#F2D578" }}
        >
          Users
        </h2>
        <p className="text-muted-foreground">
          Manage users and their roles
        </p>
      </div>
      <UsersList />
    </div>
  );
}
