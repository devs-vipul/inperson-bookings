"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { TrainerImage } from "@/components/trainer-image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

type Trainer = Doc<"trainers">;

export default function OurTrainersPage() {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const { user } = useUser();
  
  const trainers = useQuery(api.trainers.getActiveTrainers) as
    | Trainer[]
    | undefined;

  // Get current user from Convex
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Check for active monthly subscription
  const activeMonthlySubscription = useQuery(
    (api as any).monthlySubscriptions?.getActive,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const isMonthlyUnlocked = activeMonthlySubscription !== null && activeMonthlySubscription !== undefined;

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

          {/* Tabs */}
          <div className="mb-8 flex justify-center gap-4">
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-6 py-3 rounded-lg text-lg font-bold transition-all ${
                activeTab === "weekly"
                  ? "bg-[#F2D578] text-black"
                  : "bg-black text-[#F2D578] border-2 border-[#F2D578]"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={`px-6 py-3 rounded-lg text-lg font-bold transition-all ${
                activeTab === "monthly"
                  ? "bg-[#F2D578] text-black"
                  : "bg-black text-[#F2D578] border-2 border-[#F2D578]"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Weekly Tab Content */}
          {activeTab === "weekly" && (
            <>
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
            </>
          )}

          {/* Monthly Tab Content */}
          {activeTab === "monthly" && (
            <>
              {!isMonthlyUnlocked && (
                <div className="mb-8 text-center">
                  <div className="inline-block rounded-xl border-4 p-8 shadow-lg" style={{ borderColor: "rgb(242, 213, 120)" }}>
                    <Lock className="mx-auto mb-4 h-16 w-16 text-[#F2D578]" />
                    <h3 className="text-2xl font-bold mb-2">Unlock All Trainers</h3>
                    <p className="text-muted-foreground mb-6">
                      Pay $100 to unlock all trainers for 1 month. Book unlimited sessions with any trainer!
                    </p>
                    {user ? (
                      <Link href="/monthly-unlock">
                        <Button
                          className="px-8 py-6 text-lg font-bold"
                          style={{
                            backgroundColor: "#F2D578",
                            color: "#000000",
                          }}
                        >
                          Unlock for $100
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/sign-in">
                        <Button
                          className="px-8 py-6 text-lg font-bold"
                          style={{
                            backgroundColor: "#F2D578",
                            color: "#000000",
                          }}
                        >
                          Sign In to Unlock
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}

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
                    const isLocked = !isMonthlyUnlocked;
                    return (
                      <div key={trainer._id} className="relative">
                        {isLocked ? (
                          <motion.div
                            className="relative w-[271px] h-[450px] overflow-hidden rounded-xl shadow-lg shrink-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          >
                            {/* Blurred Image */}
                            <div className="w-full h-full filter blur-sm">
                              <TrainerImage
                                storageId={trainer.profilePicture}
                                alt={trainer.name || "Trainer"}
                                width={271}
                                height={450}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            {/* Lock Overlay */}
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                              <Lock className="h-16 w-16 text-[#F2D578] mb-4" />
                              <p className="text-white font-bold text-lg">Locked</p>
                            </div>
                            {/* Bottom Name Section */}
                            <article className="p-4 w-full h-[20%] flex flex-col justify-end overflow-hidden absolute bottom-0 rounded-b-xl bg-linear-to-t from-black/80 to-transparent">
                              <h1 className="text-xl font-bold text-white drop-shadow-lg">
                                {trainer.name}
                              </h1>
                              <p className="text-sm text-white/90">
                                Personal Trainer
                              </p>
                            </article>
                          </motion.div>
                        ) : (
                          <Link href={`/monthly-booking/${trainer._id}`}>
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

                              {/* Bottom Name Section */}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
