"use client";

import { Navigation } from "@/components/Navigation";
import { ContentCard } from "@/components/ContentCard";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLuminaShare, Content } from "@/hooks/useLuminaShare";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function ExplorePage() {
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
    enabled: true,
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
      if (!luminaShare.contractAddress || !luminaShare.contentCount) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const count = Number(luminaShare.contentCount);
      const contentPromises: Promise<{ id: bigint; content: Content | null }>[] =
        [];

      for (let i = 0; i < count; i++) {
        contentPromises.push(
          luminaShare.getContent(BigInt(i)).then((content) => ({
            id: BigInt(i),
            content,
          }))
        );
      }

      const results = await Promise.all(contentPromises);
      const validContents = results.filter(
        (r): r is { id: bigint; content: Content } => r.content !== null
      );

      setContents(validContents);
      setIsLoading(false);
    };

    loadContents();
  }, [luminaShare.contractAddress, luminaShare.contentCount, luminaShare.getContent]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Explore Content</h1>
          {luminaShare.contractAddress && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {contents.length} contents
            </span>
          )}
        </div>

        {!luminaShare.contractAddress && (
          <div className="p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
            LuminaShare contract not deployed on this network
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading contents...</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No contents found</p>
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
