"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { MoreHorizontal, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

type MonthlyProduct = {
  _id: Id<"monthlyProducts">;
  name: string;
  description: string;
  price: number;
  durationMonths: number;
  stripeProductId: string;
  stripePriceId: string;
  isActive: boolean;
  isArchived?: boolean;
  createdAt: number;
};

export function MonthlyProductsTable({
  archivedOnly = false,
}: {
  archivedOnly?: boolean;
}) {
  const { toast } = useToast();
  const products = useQuery(api.monthlyProducts.getAll) || [];
  const archiveProduct = useMutation(api.monthlyProducts.archive);
  const unarchiveProduct = useMutation(api.monthlyProducts.unarchive);
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set());

  const visibleProducts = products.filter((p: any) =>
    archivedOnly ? !!p.isArchived : !p.isArchived
  ) as unknown as MonthlyProduct[];

  const handleArchive = async (product: MonthlyProduct) => {
    if (loadingProducts.has(product._id)) return;

    if (!confirm(`Are you sure you want to archive "${product.name}"?`)) {
      return;
    }

    setLoadingProducts((prev) => new Set(prev).add(product._id));

    try {
      await archiveProduct({ id: product._id });

      toast({
        variant: "default",
        title: "Success",
        description: "Product archived successfully",
      });

      // Reload to refresh the list
      window.location.reload();
    } catch (error) {
      console.error("Error archiving product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to archive product. Please try again.",
      });
    } finally {
      setLoadingProducts((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  };

  const handleUnarchive = async (product: MonthlyProduct) => {
    if (loadingProducts.has(product._id)) return;

    setLoadingProducts((prev) => new Set(prev).add(product._id));

    try {
      await unarchiveProduct({ id: product._id });

      toast({
        variant: "default",
        title: "Success",
        description: "Product unarchived successfully",
      });

      // Reload to refresh the list
      window.location.reload();
    } catch (error) {
      console.error("Error unarchiving product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to unarchive product. Please try again.",
      });
    } finally {
      setLoadingProducts((prev) => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }
  };

  if (products === undefined) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (visibleProducts.length === 0) {
    return (
      <div className="rounded-lg border-2 p-8 text-center" style={{ borderColor: "#F2D578" }}>
        <p className="text-muted-foreground">
          {archivedOnly
            ? "No archived products found"
            : "No monthly products found. Create one to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2" style={{ borderColor: "#F2D578" }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleProducts.map((product) => (
            <TableRow key={product._id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="max-w-md truncate">
                {product.description}
              </TableCell>
              <TableCell>${product.price.toFixed(2)}</TableCell>
              <TableCell>{product.durationMonths} month{product.durationMonths > 1 ? "s" : ""}</TableCell>
              <TableCell>
                <Badge
                  variant={product.isActive ? "default" : "secondary"}
                  style={{
                    backgroundColor: product.isActive ? "#F2D578" : "#666",
                    color: product.isActive ? "#000" : "#fff",
                  }}
                >
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(product.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {archivedOnly ? (
                      <DropdownMenuItem
                        onClick={() => handleUnarchive(product)}
                        disabled={loadingProducts.has(product._id)}
                      >
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleArchive(product)}
                        disabled={loadingProducts.has(product._id)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    )}
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
