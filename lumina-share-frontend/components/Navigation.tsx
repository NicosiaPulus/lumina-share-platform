"use client";

import Link from "next/link";
import { WalletConnect } from "./WalletConnect";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";

export function Navigation() {
  const { isConnected } = useMetaMask();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold text-primary-600 dark:text-primary-400"
            >
              LuminaShare
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Home
              </Link>
              <Link
                href="/explore"
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Explore
              </Link>
              {isConnected && (
                <>
                  <Link
                    href="/my-content"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    My Content
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}

