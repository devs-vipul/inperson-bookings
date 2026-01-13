import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            BWF Fitness
          </h1>
          <div className="flex items-center gap-4">
            <SignedOut>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign Up
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Book Your Trainer
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Connect with expert trainers and book personalized training sessions
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/our-trainers"
                className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Book Your Trainer Now
              </Link>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg font-medium hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  Sign In
                </Link>
              </SignedOut>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Personal Training Sessions
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Book one-on-one sessions with certified trainers tailored to your fitness goals.
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
                <li>Customized workout plans</li>
                <li>Flexible scheduling</li>
                <li>Progress tracking</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Trainer Availability
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                View real-time availability and book slots that fit your schedule.
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
                <li>Real-time slot availability</li>
                <li>Multiple time slots</li>
                <li>Easy rescheduling</li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">1</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sign Up</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Create your account to get started
                </p>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">2</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Choose Trainer</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Browse available trainers and their specialties
                </p>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">3</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Book Slot</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Select your preferred time and confirm booking
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
