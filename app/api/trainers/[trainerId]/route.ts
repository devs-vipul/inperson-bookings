import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const { trainerId } = await params;

    if (!trainerId) {
      return NextResponse.json(
        { error: "Missing trainerId" },
        { status: 400 }
      );
    }

    const trainer = await convex.query(api.trainers.getById, {
      id: trainerId as Id<"trainers">,
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "Trainer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(trainer);
  } catch (error) {
    console.error("Error fetching trainer:", error);
    return NextResponse.json(
      { error: "Failed to fetch trainer" },
      { status: 500 }
    );
  }
}
