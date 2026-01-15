"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { TrainerImage } from "@/components/trainer-image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = use(params);
  const [activeTab, setActiveTab] = useState<"30" | "60">("30");
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
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-5">
        {/* Trainer Info Section */}
        <motion.div
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Trainer Image */}
          <div className="lg:col-span-3">
            <div className="relative w-full max-w-[300px] mx-auto lg:mx-0">
              <TrainerImage
                storageId={trainer.profilePicture}
                width={300}
                height={400}
                alt={trainer.name}
                className="h-[400px] w-full rounded-xl object-cover shadow-2xl"
              />
              <div
                className="absolute bottom-0 left-0 right-0 w-full rounded-b-xl py-3"
                style={{
                  background:
                    "linear-gradient(135deg, #F2D578 0%, #E8C765 100%)",
                }}
              >
                <h2 className="text-center text-[22px] font-bold text-black">
                  {trainer.name}
                </h2>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <motion.div
            className="lg:col-span-4 rounded-xl border-4 p-6 shadow-lg"
            style={{ borderColor: "rgb(242, 213, 120)" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h5
              className="mb-4 text-[24px] font-bold text-foreground border-b-2 pb-2"
              style={{ borderColor: "rgb(242, 213, 120)" }}
            >
              Expertise
            </h5>
            <ul className="space-y-3">
              {trainer.expertise?.map((expertise: string, index: number) => (
                <motion.li
                  key={expertise}
                  className="text-[15px] text-muted-foreground flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-[#F2D578] font-bold">•</span>
                  <span>{expertise}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Trainer Description */}
          <motion.div
            className="lg:col-span-5 rounded-xl border-4 p-6 shadow-lg"
            style={{ borderColor: "rgb(242, 213, 120)" }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h5
              className="mb-4 text-[24px] font-bold text-foreground border-b-2 pb-2"
              style={{ borderColor: "rgb(242, 213, 120)" }}
            >
              Trainer Description
            </h5>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              {trainer.description ||
                "No description available for this trainer."}
            </p>
          </motion.div>
        </motion.div>

        {/* Sessions Section */}
        <motion.div
          className="rounded-xl border-4 p-6 shadow-xl"
          style={{
            borderColor: "rgb(242, 213, 120)",
            backgroundColor: "rgba(242, 213, 120, 0.05)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="w-full">
            {/* Custom Tabs */}
            <div className="w-full grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setActiveTab("30")}
                style={{
                  backgroundColor: activeTab === "30" ? "#F2D578" : "#000000",
                  color: activeTab === "30" ? "#000000" : "#F2D578",
                  border: "2px solid #F2D578",
                }}
                className="py-4 rounded-lg text-lg font-bold transition-all"
              >
                30 Minutes Session
              </button>
              <button
                onClick={() => setActiveTab("60")}
                style={{
                  backgroundColor: activeTab === "60" ? "#F2D578" : "#000000",
                  color: activeTab === "60" ? "#000000" : "#F2D578",
                  border: "2px solid #F2D578",
                }}
                className="py-4 rounded-lg text-lg font-bold transition-all"
              >
                60 Minutes Session
              </button>
            </div>

            {/* 30 Min Content */}
            {activeTab === "30" && (
              <div className="my-8">
                {sessions30Min.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-muted-foreground text-lg">
                      No 30-minute sessions available yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sessions30Min.map((session, index) => (
                      <motion.div
                        key={session._id}
                        className="relative rounded-xl border-2 bg-card p-6 shadow-lg hover:shadow-2xl transition-all"
                        style={{ borderColor: "rgb(242, 213, 120)" }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                      >
                        <div
                          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 transform px-4 py-1 rounded-full shadow-md"
                          style={{ backgroundColor: "rgb(242, 213, 120)" }}
                        >
                          <p className="text-[12px] font-bold text-black">
                            {session.duration} MIN
                          </p>
                        </div>
                        <h3 className="mt-4 text-center text-[18px] font-bold">
                          {session.name}
                        </h3>
                        <p className="mt-3 text-center text-sm text-muted-foreground">
                          {session.description}
                        </p>
                        <p className="mt-4 text-center">
                          <span className="text-[28px] font-bold">
                            ${session.price}
                          </span>{" "}
                          <span className="text-sm text-muted-foreground">
                            / week
                          </span>
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            className="mt-6 w-full py-6 text-[16px] font-bold rounded-lg"
                            style={{
                              backgroundColor: "#F2D578",
                              color: "#000000",
                            }}
                            asChild
                          >
                            <Link href={`/book/${trainerId}/${session._id}`}>
                              Book Now
                            </Link>
                          </Button>
                        </motion.div>
                        <div className="mt-3 space-y-1 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            {session.sessionsPerWeek} session
                            {session.sessionsPerWeek > 1 ? "s" : ""} per week
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Recurring subscription
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 60 Min Content */}
            {activeTab === "60" && (
              <div className="my-8">
                {sessions60Min.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-muted-foreground text-lg">
                      No 60-minute sessions available yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sessions60Min.map((session, index) => (
                      <motion.div
                        key={session._id}
                        className="relative rounded-xl border-2 bg-card p-6 shadow-lg hover:shadow-2xl transition-all"
                        style={{ borderColor: "rgb(242, 213, 120)" }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                      >
                        <div
                          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 transform px-4 py-1 rounded-full shadow-md"
                          style={{ backgroundColor: "rgb(242, 213, 120)" }}
                        >
                          <p className="text-[12px] font-bold text-black">
                            {session.duration} MIN
                          </p>
                        </div>
                        <h3 className="mt-4 text-center text-[18px] font-bold">
                          {session.name}
                        </h3>
                        <p className="mt-3 text-center text-sm text-muted-foreground">
                          {session.description}
                        </p>
                        <p className="mt-4 text-center">
                          <span className="text-[28px] font-bold">
                            ${session.price}
                          </span>{" "}
                          <span className="text-sm text-muted-foreground">
                            / week
                          </span>
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            className="mt-6 w-full py-6 text-[16px] font-bold rounded-lg"
                            style={{
                              backgroundColor: "#F2D578",
                              color: "#000000",
                            }}
                            asChild
                          >
                            <Link href={`/book/${trainerId}/${session._id}`}>
                              Book Now
                            </Link>
                          </Button>
                        </motion.div>
                        <div className="mt-3 space-y-1 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            {session.sessionsPerWeek} session
                            {session.sessionsPerWeek > 1 ? "s" : ""} per week
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Recurring subscription
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
