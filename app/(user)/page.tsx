"use client";

import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                <Zap className="h-4 w-4" />
                Transform Your Fitness Journey
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold mb-6 text-foreground leading-tight"
            >
              Book Your Personal Trainer
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              Connect with expert trainers and book personalized training
              sessions tailored to your goals
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/our-trainers">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="lg"
                    className="px-8 py-6 text-lg group rounded-lg"
                    style={{
                      backgroundColor: "#F2D578",
                      color: "#000000",
                      border: "none",
                    }}
                  >
                    Book Your Trainer Now
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              </Link>
              <SignedOut>
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-6 text-lg border-2 hover:bg-primary/10 hover:border-primary"
                  >
                    Sign In
                  </Button>
                </Link>
              </SignedOut>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
