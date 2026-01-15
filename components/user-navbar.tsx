"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export function UserNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <Image
              src="/Main-logo-New.png"
              alt="BWF Fitness"
              width={120}
              height={40}
              className="transition-transform group-hover:scale-105"
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <SignedIn>
              <Link href="/your-bookings">
                <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                  My Bookings
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">
                <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Sign Up
                </Button>
              </Link>
            </SignedOut>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
