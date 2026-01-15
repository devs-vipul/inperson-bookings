"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { TrainerImage } from "@/components/trainer-image";
import { motion } from "framer-motion";

type Trainer = Doc<"trainers">;

export default function OurTrainersPage() {
  const trainers = useQuery(api.trainers.getActiveTrainers) as
    | Trainer[]
    | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner Section */}
      <section className="relative h-80 lg:h-[468px]">
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-secondary/20"></div>
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
              {trainers.map((trainer, index) => {
                return (
                  <Link key={trainer._id} href={`/our-trainers/${trainer._id}`}>
                    <motion.div
                      className="relative w-[271px] h-[450px] overflow-hidden group rounded-xl shadow-lg shrink-0 cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -8, transition: { duration: 0.3 } }}
                    >
                      {/* Image */}
                      <div className="w-full h-full">
                        <TrainerImage
                          storageId={trainer.profilePicture}
                          alt={trainer.name || "Trainer"}
                          width={271}
                          height={450}
                          className="h-full w-full object-cover scale-105 group-hover:scale-100 transition-all duration-300"
                        />
                      </div>

                      {/* Hover Overlay with Expertise */}
                      <article
                        className="p-8 w-full h-full overflow-hidden z-10 absolute top-0 flex flex-col justify-end rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
                        style={{ backgroundColor: "rgb(242, 213, 120)" }}
                      >
                        <div className="translate-y-10 group-hover:translate-y-0 transition-all duration-300 space-y-4">
                          <h1 className="text-2xl font-bold text-black">
                            Expertise
                          </h1>
                          <ul className="space-y-2 max-h-[240px] overflow-y-auto">
                            {trainer.expertise?.map((ex: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm font-medium text-black/80"
                              >
                                • {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>

                      {/* Bottom Name Section (visible by default, hidden on hover) */}
                      <article className="p-4 w-full h-[20%] flex flex-col justify-end overflow-hidden absolute bottom-0 rounded-b-xl bg-linear-to-t from-black/80 to-transparent opacity-100 group-hover:opacity-0 group-hover:-bottom-4 transition-all duration-300">
                        <h1 className="text-xl font-bold text-white drop-shadow-lg">
                          {trainer.name}
                        </h1>
                        <p className="text-sm text-white/90">
                          Personal Trainer
                        </p>
                      </article>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
