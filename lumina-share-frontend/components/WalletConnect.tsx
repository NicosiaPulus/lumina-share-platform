"use client";

import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useState } from "react";

export function WalletConnect() {
  const { provider, accounts, isConnected, connect, chainId } = useMetaMask();
  const [showMenu, setShowMenu] = useState(false);

  if (!provider) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No wallet detected
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  const address = accounts?.[0] || "";
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {shortAddress}
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="space-y-2">
            <div className="text-sm">
              <div className="text-gray-500 dark:text-gray-400">Address</div>
              <div className="font-mono text-xs break-all">{address}</div>
            </div>
            <div className="text-sm">
              <div className="text-gray-500 dark:text-gray-400">Chain ID</div>
              <div>{chainId}</div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(address);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Copy Address
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

