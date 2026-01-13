"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { TrainerImage } from "@/components/trainer-image";

type Trainer = Doc<"trainers">;

export default function OurTrainersPage() {
  const trainers = useQuery(api.trainers.getActiveTrainers) as
    | Trainer[]
    | undefined;
  const [visibleTrainerId, setVisibleTrainerId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner Section */}
      <section className="relative h-80 lg:h-[468px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
        <div className="absolute inset-0 z-10 bg-background/50"></div>
        <div className="absolute inset-0 z-30 flex w-full flex-col items-center justify-center px-2 md:px-5 lg:px-0">
          <h2 className="max-w-5xl text-balance text-center text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
            Our Trainers
          </h2>
          <p className="mt-5 max-w-5xl text-center text-lg font-medium text-muted-foreground lg:text-xl">
            Meet our team of expert trainers who are dedicated to helping you
            achieve your fitness goals.
          </p>
        </div>
      </section>

      {/* Trainers Section */}
      <section className="bg-background py-12">
        <div className="mx-auto my-12 max-w-[1220px] px-5">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
              Book In-Person Training
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground md:text-base lg:text-lg">
              Our certified trainers are here to guide you on your fitness
              journey
            </p>
          </div>

          {trainers === undefined ? (
            <div className="flex justify-center py-20">
              <p className="text-muted-foreground">Loading trainers...</p>
            </div>
          ) : trainers.length === 0 ? (
            <div className="flex justify-center py-20">
              <p className="text-muted-foreground">
                No trainers available at the moment.
              </p>
            </div>
          ) : (
            <div className="no-scrollbar mt-14 flex gap-10 overflow-x-auto px-5 lg:grid lg:grid-cols-4 lg:px-0">
              {trainers.map((trainer) => {
                return (
                  <div key={trainer._id} className="relative w-fit shrink-0">
                    {/* Image container with group hover */}
                    <div className="group relative">
                      <TrainerImage
                        storageId={trainer.profilePicture}
                        alt={trainer.name || "Trainer"}
                        width={271}
                        height={370}
                        className="h-[321px] w-[234px] object-cover lg:h-[370px] lg:w-[271px]"
                      />
                      {/* Overlay that appears on hover */}
                      <div
                        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-500 ${
                          visibleTrainerId === trainer._id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <div className="flex h-full flex-col items-start justify-center p-5">
                          {visibleTrainerId === trainer._id && (
                            <button
                              onClick={() => setVisibleTrainerId(null)}
                              className="absolute right-2 top-2 text-foreground"
                            >
                              ✕
                            </button>
                          )}
                          <h3 className="mb-1 text-[20px] font-bold text-foreground">
                            Expertise
                          </h3>
                          {trainer.expertise?.map((ex: string, i: number) => (
                            <li
                              key={i}
                              className="list-none text-[12px] font-bold text-foreground"
                            >
                              - {ex}
                            </li>
                          ))}
                          <div className="block w-full">
                            <Link href={`/our-trainers/${trainer._id}`}>
                              <Button className="mt-5 w-full text-[15px] font-bold">
                                Book Appointment
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trainer name div - separate from hover effect */}
                    <div className="absolute bottom-0 left-0 flex w-full flex-col items-start rounded-b-lg bg-primary p-2 text-primary-foreground lg:p-1">
                      <p className="text-xl font-bold">{trainer.name}</p>
                      <button
                        onClick={() => setVisibleTrainerId(trainer._id)}
                        className="cursor-pointer text-[12px] font-bold hover:no-underline"
                      >
                        - View Expertise
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
