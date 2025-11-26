"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLuminaShare } from "@/hooks/useLuminaShare";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function DashboardPage() {
  const { isConnected, accounts } = useMetaMask();
  const {
    provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: isConnected,
  });

  const luminaShare = useLuminaShare({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [totalEarningsHandle, setTotalEarningsHandle] = useState<string | undefined>(undefined);
  const [decryptedEarnings, setDecryptedEarnings] = useState<bigint | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!isConnected || !accounts || accounts.length === 0 || !luminaShare.contractAddress) {
        return;
      }

      if (!luminaShare.contractAddress || !ethersReadonlyProvider) {
        return;
      }

      try {
        const { LuminaShareABI } = await import("@/abi/LuminaShareABI");
        const contract = new ethers.Contract(
          luminaShare.contractAddress,
          LuminaShareABI.abi,
          ethersReadonlyProvider
        );

        const earnings = await contract.getCreatorEarnings(accounts[0]);
        setTotalEarningsHandle(earnings);
      } catch (error) {
        console.error("Failed to load earnings:", error);
      }
    };

    loadEarnings();
  }, [isConnected, accounts, luminaShare.contractAddress, ethersReadonlyProvider]);

  const handleAuthorizeDecrypt = async () => {
    if (!luminaShare.contractAddress || !ethersSigner) {
      return;
    }

    setIsAuthorizing(true);
    try {
      const { LuminaShareABI } = await import("@/abi/LuminaShareABI");
      const contract = new ethers.Contract(
        luminaShare.contractAddress!,
        LuminaShareABI.abi,
        ethersSigner
      );

      const tx = await contract.authorizeDecrypt(0);
      await tx.wait();

      // Now decrypt
      if (totalEarningsHandle) {
        setIsDecrypting(true);
        const decrypted = await luminaShare.decryptEarnings(BigInt(0), totalEarningsHandle);
        setDecryptedEarnings(decrypted);
        setIsDecrypting(false);
      }
    } catch (error: any) {
      console.error("Failed to authorize decrypt:", error);
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Total Earnings</h2>
            {totalEarningsHandle === ethers.ZeroHash ? (
              <p className="text-gray-600 dark:text-gray-400">No earnings yet</p>
            ) : decryptedEarnings !== null ? (
              <div>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {decryptedEarnings.toString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Token units
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  Encrypted Earnings
                </p>
                <button
                  onClick={handleAuthorizeDecrypt}
                  disabled={isAuthorizing || isDecrypting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isAuthorizing
                    ? "Authorizing..."
                    : isDecrypting
                      ? "Decrypting..."
                      : "Decrypt Earnings"}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href="/create"
                className="block w-full px-4 py-2 text-center bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Create Content
              </a>
              <a
                href="/my-content"
                className="block w-full px-4 py-2 text-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                View My Content
              </a>
            </div>
          </div>
        </div>

        {luminaShare.message && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {luminaShare.message}
          </div>
        )}
      </div>
    </div>
  );
}
