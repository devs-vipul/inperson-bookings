"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { TrainerImage } from "@/components/trainer-image";
import Link from "next/link";

export default function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const trainer = useQuery(api.trainers.getById, {
    id: trainerId as Id<"trainers">,
  });
  const sessions = useQuery(api.sessions.getByTrainerId, {
    trainerId: trainerId as Id<"trainers">,
  });

  if (trainer === undefined || sessions === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (trainer === null || !trainer.status) {
    notFound();
  }

  const sessions30Min = sessions?.filter((s) => s.duration === 30) || [];
  const sessions60Min = sessions?.filter((s) => s.duration === 60) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto my-10 max-w-7xl px-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
          {/* Trainer Image */}
          <div className="col-span-1 flex justify-center md:col-span-1">
            <div className="relative w-full max-w-[250px]">
              <TrainerImage
                storageId={trainer.profilePicture}
                width={300}
                height={400}
                alt={trainer.name}
                className="h-[350px] w-full rounded-lg object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 w-full rounded-b-lg bg-primary text-primary-foreground">
                <h2 className="py-2 text-center text-[16px] font-bold sm:text-[20px]">
                  {trainer.name}
                </h2>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <div className="col-span-1 rounded-lg border bg-card p-4 text-card-foreground md:col-span-1">
            <h5 className="mb-3 text-[18px] font-bold sm:text-[20px]">
              Expertise
            </h5>
            <ul className="space-y-1">
              {trainer.expertise?.map((expertise: string) => (
                <li
                  key={expertise}
                  className="text-[12px] text-muted-foreground sm:text-[14px]"
                >
                  - {expertise}
                </li>
              ))}
            </ul>
          </div>

          {/* Trainer Description */}
          <div className="col-span-1 rounded-lg border bg-card p-4 text-card-foreground md:col-span-2 lg:col-span-3">
            <h5 className="mb-3 text-[18px] font-bold sm:text-[20px]">
              Trainer Description
            </h5>
            <p className="text-[12px] text-muted-foreground sm:text-[14px]">
              {trainer.description ||
                "No description available for this trainer."}
            </p>
          </div>
        </div>
      </div>

      {/* Sessions Tabs */}
      <div className="mx-auto my-10 max-w-7xl rounded-lg border bg-card p-5">
        <Tabs defaultValue="30_mint" className="w-full">
          <TabsList>
            <TabsTrigger value="30_mint">30 Minutes Session</TabsTrigger>
            <TabsTrigger value="60_mint">60 Minutes Session</TabsTrigger>
          </TabsList>
          <TabsContent value="30_mint" className="my-10">
            {sessions30Min.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-muted-foreground">
                  No 30-minute sessions available yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {sessions30Min.map((session) => (
                  <div
                    key={session._id}
                    className="relative rounded-lg border bg-card p-4"
                  >
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 transform bg-primary px-3 text-primary-foreground rounded-b">
                      <p className="text-[10px] font-bold">
                        {session.duration} minutes
                      </p>
                    </div>
                    <h3 className="mt-3 text-center text-[16px] font-bold">
                      {session.name}
                    </h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      {session.description}
                    </p>
                    <p className="mt-2 text-center">
                      <span className="text-[24px] font-bold">
                        ${session.price}
                      </span>{" "}
                      <span className="text-sm text-muted-foreground">
                        / week
                      </span>
                    </p>
                    <Button className="mt-4 w-full" asChild>
                      <Link href={`/book/${trainerId}/${session._id}`}>
                        Book Now
                      </Link>
                    </Button>
                    <p className="mt-2 text-center text-[8px] text-muted-foreground">
                      {session.sessionsPerWeek} session
                      {session.sessionsPerWeek > 1 ? "s" : ""} / week
                    </p>
                    <p className="mt-1 text-center text-[8px] text-muted-foreground">
                      Recurring subscription
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="60_mint" className="my-10">
            {sessions60Min.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-muted-foreground">
                  No 60-minute sessions available yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {sessions60Min.map((session) => (
                  <div
                    key={session._id}
                    className="relative rounded-lg border bg-card p-4"
                  >
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 transform bg-primary px-3 text-primary-foreground rounded-b">
                      <p className="text-[10px] font-bold">
                        {session.duration} minutes
                      </p>
                    </div>
                    <h3 className="mt-3 text-center text-[16px] font-bold">
                      {session.name}
                    </h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      {session.description}
                    </p>
                    <p className="mt-2 text-center">
                      <span className="text-[24px] font-bold">
                        ${session.price}
                      </span>{" "}
                      <span className="text-sm text-muted-foreground">
                        / week
                      </span>
                    </p>
                    <Button className="mt-4 w-full" asChild>
                      <Link href={`/book/${trainerId}/${session._id}`}>
                        Book Now
                      </Link>
                    </Button>
                    <p className="mt-2 text-center text-[8px] text-muted-foreground">
                      {session.sessionsPerWeek} session
                      {session.sessionsPerWeek > 1 ? "s" : ""} / week
                    </p>
                    <p className="mt-1 text-center text-[8px] text-muted-foreground">
                      Recurring subscription
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
