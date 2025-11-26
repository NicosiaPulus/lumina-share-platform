"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLuminaShare, ContentType, AccessType, ContentTypeValue, AccessTypeValue } from "@/hooks/useLuminaShare";
import { useState } from "react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function CreatePage() {
  const { isConnected } = useMetaMask();
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

  const [title, setTitle] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [contentType, setContentType] = useState<ContentTypeValue>(ContentType.Article);
  const [accessType, setAccessType] = useState<AccessTypeValue>(AccessType.Public);
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!isConnected) {
      redirect("/");
    }
  }, [isConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !contentHash) {
      alert("Please fill in all required fields");
      return;
    }

    const priceNum = accessType === AccessType.Public ? 0 : parseFloat(price);
    if (accessType !== AccessType.Public && (isNaN(priceNum) || priceNum <= 0)) {
      alert("Please enter a valid price");
      return;
    }

    await luminaShare.createContent(
      title,
      contentHash,
      contentType,
      accessType,
      priceNum
    );
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Create Content</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content URL / IPFS Hash *
            </label>
            <input
              type="text"
              value={contentHash}
              onChange={(e) => setContentHash(e.target.value)}
              placeholder="ipfs://Qm..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(Number(e.target.value) as ContentTypeValue)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value={ContentType.Article}>Article</option>
              <option value={ContentType.Video}>Video</option>
              <option value={ContentType.Music}>Music</option>
              <option value={ContentType.Other}>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Type
            </label>
            <select
              value={accessType}
              onChange={(e) => setAccessType(Number(e.target.value) as AccessTypeValue)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value={AccessType.Public}>Public (Free)</option>
              <option value={AccessType.Paid}>Paid</option>
              <option value={AccessType.Subscription}>Subscription</option>
            </select>
          </div>

          {accessType !== AccessType.Public && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price (in token units) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          )}

          {luminaShare.message && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {luminaShare.message}
            </div>
          )}

          <button
            type="submit"
            disabled={luminaShare.isLoading}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {luminaShare.isLoading ? "Creating..." : "Create Content"}
          </button>
        </form>
      </div>
    </div>
  );
}
