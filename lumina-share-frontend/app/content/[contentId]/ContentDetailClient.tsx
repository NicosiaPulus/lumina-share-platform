"use client";

import { Navigation } from "@/components/Navigation";
import { PaymentForm } from "@/components/PaymentForm";
import { TipForm } from "@/components/TipForm";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useLuminaShare, AccessType } from "@/hooks/useLuminaShare";
import { useState, useEffect } from "react";

interface ContentDetailClientProps {
  contentId: string;
}

export function ContentDetailClient({ contentId }: ContentDetailClientProps) {
  const contentIdBigInt = BigInt(contentId);

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

  const [content, setContent] = useState<import("@/hooks/useLuminaShare").Content | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | undefined>(undefined);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!luminaShare.contractAddress) {
        setIsLoadingContent(false);
        return;
      }

      setIsLoadingContent(true);
      const loadedContent = await luminaShare.getContent(contentIdBigInt);
      setContent(loadedContent);

      if (loadedContent && accounts && accounts.length > 0) {
        const access = await luminaShare.checkAccess(contentIdBigInt, accounts[0]);
        setHasAccess(access);
      }

      setIsLoadingContent(false);
    };

    loadContent();
  }, [luminaShare.contractAddress, contentIdBigInt, accounts, luminaShare.getContent, luminaShare.checkAccess]);

  const handlePurchase = async (contentId: bigint, amount: number) => {
    await luminaShare.purchaseContent(contentId, amount);
    if (accounts && accounts.length > 0) {
      const access = await luminaShare.checkAccess(contentId, accounts[0]);
      setHasAccess(access);
    }
  };

  const handleTip = async (contentId: bigint, amount: number, tipType: number) => {
    await luminaShare.tipContent(contentId, amount, tipType as any);
  };

  const handleSubscribe = async (
    contentId: bigint,
    fee: number,
    durationMonths: number,
    autoRenew: boolean
  ) => {
    await luminaShare.subscribe(contentId, fee, durationMonths, autoRenew);
    if (accounts && accounts.length > 0) {
      const access = await luminaShare.checkAccess(contentId, accounts[0]);
      setHasAccess(access);
    }
  };

  if (isLoadingContent) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <p className="text-gray-600 dark:text-gray-400">Content not found</p>
        </div>
      </div>
    );
  }

  const needsPayment = content.accessType === AccessType.Paid && !hasAccess;
  const needsSubscription = content.accessType === AccessType.Subscription && !hasAccess;
  const canView = content.accessType === AccessType.Public || hasAccess;

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>By {content.creator.slice(0, 6)}...{content.creator.slice(-4)}</span>
            <span>•</span>
            <span>{new Date(Number(content.createdAt) * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {needsPayment && (
          <div className="mb-8 p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-xl font-semibold mb-4">Purchase Required</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This content requires payment. Please enter the payment amount to access.
            </p>
            <PaymentForm
              contentId={contentIdBigInt}
              onPurchase={handlePurchase}
              isLoading={luminaShare.isLoading}
            />
          </div>
        )}

        {needsSubscription && (
          <div className="mb-8 p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-xl font-semibold mb-4">Subscription Required</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This content requires a subscription. Please subscribe to access.
            </p>
            <SubscriptionForm
              contentId={contentIdBigInt}
              onSubscribe={handleSubscribe}
              isLoading={luminaShare.isLoading}
            />
          </div>
        )}

        {canView && (
          <div className="mb-8 p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Content</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300">
                Content URL: <a href={content.contentHash} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">{content.contentHash}</a>
              </p>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="mb-8 p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Tip Creator</h2>
            <TipForm
              contentId={contentIdBigInt}
              onTip={handleTip}
              isLoading={luminaShare.isLoading}
            />
          </div>
        )}

        {luminaShare.message && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {luminaShare.message}
          </div>
        )}
      </div>
    </div>
  );
}


