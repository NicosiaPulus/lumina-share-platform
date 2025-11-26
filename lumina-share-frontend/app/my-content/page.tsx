"use client";

import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLuminaShare, Content } from "@/hooks/useLuminaShare";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function MyContentPage() {
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

  const [contents, setContents] = useState<
    Array<{ id: bigint; content: Content }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContents = async () => {
      if (!isConnected || !accounts || accounts.length === 0 || !luminaShare.contractAddress) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const contentIds = await luminaShare.getUserContentIds(accounts[0]);
      const contentPromises = contentIds.map(async (id) => {
        const content = await luminaShare.getContent(id);
        return { id, content };
      });

      const results = await Promise.all(contentPromises);
      const validContents = results.filter(
        (r): r is { id: bigint; content: Content } => r.content !== null
      );

      setContents(validContents);
      setIsLoading(false);
    };

    loadContents();
  }, [
    isConnected,
    accounts,
    luminaShare.contractAddress,
    luminaShare.getUserContentIds,
    luminaShare.getContent,
  ]);

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to view your content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Content</h1>
          <Link
            href="/create"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create New Content
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading your content...</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't created any content yet.
            </p>
            <Link
              href="/create"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Your First Content
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map(({ id, content }) => (
              <ContentCard key={id.toString()} content={content} contentId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
