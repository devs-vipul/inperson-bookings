"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

export function TrainerImage({
  storageId,
  alt,
  width,
  height,
  className,
}: {
  storageId?: Id<"_storage">;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const imageUrl = useQuery(
    api.storage.getImageUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId) {
    return (
      <Image
        src="/assets/images/default-trainer.png"
        alt={alt}
        width={width}
        height={height}
        className={className}
        unoptimized
      />
    );
  }

  if (imageUrl === undefined) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl || "/assets/images/default-trainer.png"}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
    />
  );
}
