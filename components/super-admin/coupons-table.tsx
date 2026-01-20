"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Coupon = {
  _id: Id<"discountCode">;
  name: string;
  code: string;
  disc_type: "percentage" | "flat";
  add_disc: number;
  stripeCouponId: string;
  validity: number;
  isArchived?: boolean;
  createdAt: number;
};

export function CouponsTable({
  archivedOnly = false,
}: {
  archivedOnly?: boolean;
}) {
  const { toast } = useToast();
  const coupons = useQuery(api.coupons.getAll) || [];
  const [loadingCoupons, setLoadingCoupons] = useState<Set<string>>(new Set());

  const visibleCoupons = coupons.filter((c: any) =>
    archivedOnly ? !!c.isArchived : !c.isArchived
  ) as unknown as Coupon[];

  const handleDelete = async (coupon: Coupon) => {
    if (loadingCoupons.has(coupon._id)) return;
    
    if (!confirm(`Are you sure you want to delete "${coupon.code}"? This action cannot be undone.`)) {
      return;
    }

    setLoadingCoupons((prev) => new Set(prev).add(coupon._id));

    try {
      const response = await fetch("/api/stripe/coupons/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponId: coupon._id,
          stripeCouponId: coupon.stripeCouponId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete coupon");
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Coupon deleted successfully",
      });

      // Reload to refresh the list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete coupon. Please try again.",
      });
    } finally {
      setLoadingCoupons((prev) => {
        const next = new Set(prev);
        next.delete(coupon._id);
        return next;
      });
    }
  };

  const handleArchive = async (coupon: Coupon, action: "archive" | "unarchive") => {
    if (loadingCoupons.has(coupon._id)) return;

    setLoadingCoupons((prev) => new Set(prev).add(coupon._id));

    try {
      const response = await fetch("/api/stripe/coupons/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponId: coupon._id,
          stripeCouponId: coupon.stripeCouponId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} coupon`);
      }

      toast({
        variant: "success",
        title: "Success",
        description: `Coupon ${action === "archive" ? "archived" : "unarchived"} successfully`,
      });

      // Reload to refresh the list
      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing coupon:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${action} coupon. Please try again.`,
      });
    } finally {
      setLoadingCoupons((prev) => {
        const next = new Set(prev);
        next.delete(coupon._id);
        return next;
      });
    }
  };

  if (visibleCoupons.length === 0) {
    return (
      <div className="rounded-lg border-2 p-6 text-center" style={{ borderColor: "#F2D578" }}>
        <p className="text-muted-foreground">
          {archivedOnly ? "No archived coupons found." : "No coupons found. Create your first coupon!"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: "#F2D578" }}>
      <div className="p-4 border-b" style={{ borderColor: "#F2D578" }}>
        <h2 className="text-xl font-semibold" style={{ color: "#F2D578" }}>
          {archivedOnly ? "Archived Coupons" : "All Coupons"} ({visibleCoupons.length})
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-b" style={{ borderColor: "#F2D578" }}>
            <TableHead style={{ color: "#F2D578" }}>S.No</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Name</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Code</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Type</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Discount</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Validity</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Status</TableHead>
            <TableHead style={{ color: "#F2D578" }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleCoupons.map((coupon, index) => (
            <TableRow
              key={coupon._id}
              className={index % 2 === 0 ? "bg-[#151515]" : "bg-[#1C1C1C]"}
            >
              <TableCell>{(index + 1).toString().padStart(2, "0")}</TableCell>
              <TableCell>{coupon.name}</TableCell>
              <TableCell>
                <code className="px-2 py-1 bg-gray-800 rounded text-yellow-400">
                  {coupon.code}
                </code>
              </TableCell>
              <TableCell className="capitalize">{coupon.disc_type}</TableCell>
              <TableCell>
                {coupon.disc_type === "percentage"
                  ? `${coupon.add_disc}%`
                  : `$${coupon.add_disc}`}
              </TableCell>
              <TableCell>{coupon.validity} month{coupon.validity !== 1 ? "s" : ""}</TableCell>
              <TableCell>
                <span
                  className={
                    coupon.isArchived
                      ? "px-2 py-1 bg-gray-700 rounded text-gray-400 text-sm"
                      : "px-2 py-1 bg-green-900/30 rounded text-green-400 text-sm"
                  }
                >
                  {coupon.isArchived ? "Archived" : "Active"}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={loadingCoupons.has(coupon._id)}
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black border-2" style={{ borderColor: "#F2D578" }}>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {coupon.isArchived ? (
                      <DropdownMenuItem
                        onClick={() => handleArchive(coupon, "unarchive")}
                        disabled={loadingCoupons.has(coupon._id)}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Unarchive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleArchive(coupon, "archive")}
                        disabled={loadingCoupons.has(coupon._id)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(coupon)}
                      disabled={loadingCoupons.has(coupon._id)}
                      className="text-red-400"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
