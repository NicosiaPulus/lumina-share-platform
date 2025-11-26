"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-primary-600">
            LuminaShare
          </h1>
          <p className="text-2xl text-text-light dark:text-text-dark mb-8">
            Privacy-Preserved Content Sharing
          </p>
          <p className="text-lg mb-12 text-gray-600 dark:text-gray-400">
            Share, Monetize, and Support Creators with Full Privacy Protection
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-slate-800">
              <h3 className="text-xl font-semibold mb-4">Encrypted Payments & Tips</h3>
              <p className="text-gray-600 dark:text-gray-400">
                All transactions are encrypted on-chain, protecting user privacy while maintaining transparency.
              </p>
            </div>
            <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-slate-800">
              <h3 className="text-xl font-semibold mb-4">Privacy-First Monetization</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Creators can monetize content without exposing individual payment amounts.
              </p>
            </div>
            <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-slate-800">
              <h3 className="text-xl font-semibold mb-4">Transparent Yet Private</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Blockchain transparency with full privacy protection using FHEVM technology.
              </p>
            </div>
            <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-slate-800">
              <h3 className="text-xl font-semibold mb-4">Decentralized Economy</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No trusted third parties required. Fully decentralized content sharing platform.
              </p>
            </div>
          </div>

          <Link
            href="/explore"
            className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}

