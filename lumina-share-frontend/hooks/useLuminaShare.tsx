"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { LuminaShareAddresses } from "@/abi/LuminaShareAddresses";
import { LuminaShareABI } from "@/abi/LuminaShareABI";

type LuminaShareInfoType = {
  abi: typeof LuminaShareABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getLuminaShareByChainId(
  chainId: number | undefined
): LuminaShareInfoType {
  if (!chainId) {
    return { abi: LuminaShareABI.abi };
  }

  const entry =
    LuminaShareAddresses[chainId.toString() as keyof typeof LuminaShareAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: LuminaShareABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: LuminaShareABI.abi,
  };
}

// Enums matching contract definitions
export enum ContentType {
  Article = 0,
  Video = 1,
  Music = 2,
  Other = 3,
}

export enum AccessType {
  Public = 0,
  Paid = 1,
  Subscription = 2,
}

export enum TipType {
  OneTime = 0,
  TimeBased = 1,
  ViewBased = 2,
}

// Type aliases for backward compatibility
export type ContentTypeValue = 0 | 1 | 2 | 3;
export type AccessTypeValue = 0 | 1 | 2;
export type TipTypeValue = 0 | 1 | 2;

export interface Content {
  creator: string;
  title: string;
  contentHash: string;
  contentType: ContentTypeValue;
  accessType: AccessTypeValue;
  createdAt: bigint;
  active: boolean;
}

export const useLuminaShare = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [contentCount, setContentCount] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const luminaShareRef = useRef<LuminaShareInfoType | undefined>(undefined);
  const isLoadingRef = useRef<boolean>(false);

  const luminaShare = useMemo(() => {
    const c = getLuminaShareByChainId(chainId);
    luminaShareRef.current = c;

    if (!c.address) {
      setMessage(`LuminaShare deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!luminaShare) {
      return undefined;
    }
    return (
      Boolean(luminaShare.address) &&
      luminaShare.address !== ethers.ZeroAddress
    );
  }, [luminaShare]);

  const refreshContentCount = useCallback(() => {
    if (isLoadingRef.current) {
      return;
    }

    if (
      !luminaShareRef.current ||
      !luminaShareRef.current?.chainId ||
      !luminaShareRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setContentCount(undefined);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const thisChainId = luminaShareRef.current.chainId;
    const thisAddress = luminaShareRef.current.address;

    const contract = new ethers.Contract(
      thisAddress,
      luminaShareRef.current.abi,
      ethersReadonlyProvider
    );

    contract
      .getContentCount()
      .then((value: bigint) => {
        if (
          sameChain.current(thisChainId) &&
          thisAddress === luminaShareRef.current?.address
        ) {
          setContentCount(value);
        }
        isLoadingRef.current = false;
        setIsLoading(false);
      })
      .catch((e: Error) => {
        setMessage("LuminaShare.getContentCount() call failed! error=" + e);
        isLoadingRef.current = false;
        setIsLoading(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshContentCount();
  }, [refreshContentCount]);

  const createContent = useCallback(
    async (
      title: string,
      contentHash: string,
      contentType: ContentTypeValue,
      accessType: AccessTypeValue,
      price: number
    ) => {
      if (isLoadingRef.current) {
        return;
      }

      if (
        !luminaShare.address ||
        !instance ||
        !ethersSigner ||
        !title ||
        !contentHash
      ) {
        setMessage("Missing required parameters for createContent");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = luminaShare.address;
      const thisEthersSigner = ethersSigner;

      isLoadingRef.current = true;
      setIsLoading(true);
      setMessage("Encrypting price...");

      try {
        const contract = new ethers.Contract(
          thisAddress,
          luminaShare.abi,
          thisEthersSigner
        );

        console.log("[createContent] Creating encrypted input for contract:", thisAddress, "user:", thisEthersSigner.address);
        
        const encryptedPrice = instance.createEncryptedInput(
          thisAddress,
          thisEthersSigner.address
        );
        
        const priceValue = accessType === AccessType.Public ? 0 : price;
        console.log("[createContent] Adding value:", priceValue, "accessType:", accessType);
        encryptedPrice.add32(priceValue);

        console.log("[createContent] Encrypting...");
        const enc = await encryptedPrice.encrypt();
        console.log("[createContent] Encryption successful, handles:", enc.handles);

        if (
          thisAddress !== luminaShareRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner)
        ) {
          setMessage("Operation cancelled");
          return;
        }

        setMessage("Creating content...");

        const tx = await contract.createContent(
          title,
          contentHash,
          contentType,
          accessType,
          enc.handles[0],
          enc.inputProof
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Content created! Status: ${receipt?.status}`);

        if (
          thisAddress === luminaShareRef.current?.address &&
          sameChain.current(thisChainId) &&
          sameSigner.current(thisEthersSigner)
        ) {
          refreshContentCount();
        }
      } catch (error: any) {
        console.error("[createContent] Error details:", error);
        console.error("[createContent] Error stack:", error.stack);
        const errorMessage = error.message || String(error);
        setMessage(`Create content failed: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      luminaShare.address,
      luminaShare.abi,
      instance,
      ethersSigner,
      chainId,
      refreshContentCount,
      sameChain,
      sameSigner,
    ]
  );

  const purchaseContent = useCallback(
    async (contentId: bigint, amount: number) => {
      if (isLoadingRef.current) {
        return;
      }

      if (!luminaShare.address || !instance || !ethersSigner) {
        setMessage("Missing required parameters for purchaseContent");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = luminaShare.address;
      const thisEthersSigner = ethersSigner;

      isLoadingRef.current = true;
      setIsLoading(true);
      setMessage("Encrypting payment amount...");

      try {
        const contract = new ethers.Contract(
          thisAddress,
          luminaShare.abi,
          thisEthersSigner
        );

        const encryptedAmount = instance.createEncryptedInput(
          thisAddress,
          thisEthersSigner.address
        );
        encryptedAmount.add32(amount);

        const enc = await encryptedAmount.encrypt();

        if (
          thisAddress !== luminaShareRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner)
        ) {
          setMessage("Operation cancelled");
          return;
        }

        setMessage("Purchasing content...");

        const tx = await contract.purchaseContent(
          contentId,
          enc.handles[0],
          enc.inputProof
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Purchase completed! Status: ${receipt?.status}`);
      } catch (error: any) {
        setMessage(`Purchase failed: ${error.message}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      luminaShare.address,
      luminaShare.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const tipContent = useCallback(
    async (contentId: bigint, amount: number, tipType: TipTypeValue) => {
      if (isLoadingRef.current) {
        return;
      }

      if (!luminaShare.address || !instance || !ethersSigner) {
        setMessage("Missing required parameters for tipContent");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = luminaShare.address;
      const thisEthersSigner = ethersSigner;

      isLoadingRef.current = true;
      setIsLoading(true);
      setMessage("Encrypting tip amount...");

      try {
        const contract = new ethers.Contract(
          thisAddress,
          luminaShare.abi,
          thisEthersSigner
        );

        const encryptedAmount = instance.createEncryptedInput(
          thisAddress,
          thisEthersSigner.address
        );
        encryptedAmount.add32(amount);

        const enc = await encryptedAmount.encrypt();

        if (
          thisAddress !== luminaShareRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner)
        ) {
          setMessage("Operation cancelled");
          return;
        }

        setMessage("Sending tip...");

        const tx = await contract.tipContent(
          contentId,
          enc.handles[0],
          tipType,
          enc.inputProof
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Tip sent! Status: ${receipt?.status}`);
      } catch (error: any) {
        setMessage(`Tip failed: ${error.message}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      luminaShare.address,
      luminaShare.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const getContent = useCallback(
    async (contentId: bigint): Promise<Content | null> => {
      if (!luminaShare.address || !ethersReadonlyProvider) {
        return null;
      }

      try {
        const contract = new ethers.Contract(
          luminaShare.address,
          luminaShare.abi,
          ethersReadonlyProvider
        );

        const content = await contract.contents(contentId);
        return {
          creator: content.creator,
          title: content.title,
          contentHash: content.contentHash,
          contentType: Number(content.contentType) as ContentTypeValue,
          accessType: Number(content.accessType) as AccessTypeValue,
          createdAt: content.createdAt,
          active: content.active,
        };
      } catch (error) {
        console.error("Failed to get content:", error);
        return null;
      }
    },
    [luminaShare.address, luminaShare.abi, ethersReadonlyProvider]
  );

  const checkAccess = useCallback(
    async (contentId: bigint, userAddress: string): Promise<boolean> => {
      if (!luminaShare.address || !ethersReadonlyProvider) {
        return false;
      }

      try {
        const contract = new ethers.Contract(
          luminaShare.address,
          luminaShare.abi,
          ethersReadonlyProvider
        );

        return await contract.checkAccess(contentId, userAddress);
      } catch (error) {
        console.error("Failed to check access:", error);
        return false;
      }
    },
    [luminaShare.address, luminaShare.abi, ethersReadonlyProvider]
  );

  const getUserContentIds = useCallback(
    async (creatorAddress: string): Promise<bigint[]> => {
      if (!luminaShare.address || !ethersReadonlyProvider) {
        return [];
      }

      try {
        const contract = new ethers.Contract(
          luminaShare.address,
          luminaShare.abi,
          ethersReadonlyProvider
        );

        return await contract.getUserContentIds(creatorAddress);
      } catch (error) {
        console.error("Failed to get user content IDs:", error);
        return [];
      }
    },
    [luminaShare.address, luminaShare.abi, ethersReadonlyProvider]
  );

  const decryptEarnings = useCallback(
    async (
      contentId: bigint,
      handle: string
    ): Promise<bigint | null> => {
      if (!luminaShare.address || !instance || !ethersSigner) {
        return null;
      }

      if (handle === ethers.ZeroHash) {
        return BigInt(0);
      }

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [luminaShare.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return null;
        }

        setMessage("Decrypting earnings...");

        const res = await instance.userDecrypt(
          [{ handle, contractAddress: luminaShare.address as `0x${string}` }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("Earnings decrypted!");

        // v0.3.0: UserDecryptResults 类型
        const value = res[handle as keyof typeof res];
        return value ? BigInt(value) : BigInt(0);
      } catch (error: any) {
        setMessage(`Decryption failed: ${error.message}`);
        return null;
      }
    },
    [
      luminaShare.address,
      instance,
      ethersSigner,
      fhevmDecryptionSignatureStorage,
    ]
  );

  const subscribe = useCallback(
    async (
      contentId: bigint,
      fee: number,
      durationMonths: number,
      autoRenew: boolean
    ) => {
      if (isLoadingRef.current) {
        return;
      }

      if (!luminaShare.address || !instance || !ethersSigner) {
        setMessage("Missing required parameters for subscribe");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = luminaShare.address;
      const thisEthersSigner = ethersSigner;

      isLoadingRef.current = true;
      setIsLoading(true);
      setMessage("Encrypting subscription fee...");

      try {
        const contract = new ethers.Contract(
          thisAddress,
          luminaShare.abi,
          thisEthersSigner
        );

        const encryptedFee = instance.createEncryptedInput(
          thisAddress,
          thisEthersSigner.address
        );
        encryptedFee.add32(fee);

        const enc = await encryptedFee.encrypt();

        if (
          thisAddress !== luminaShareRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner)
        ) {
          setMessage("Operation cancelled");
          return;
        }

        setMessage("Creating subscription...");

        const tx = await contract.subscribe(
          contentId,
          enc.handles[0],
          enc.inputProof,
          durationMonths,
          autoRenew
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Subscription created! Status: ${receipt?.status}`);
      } catch (error: any) {
        setMessage(`Subscription failed: ${error.message}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      luminaShare.address,
      luminaShare.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const cancelSubscription = useCallback(
    async (contentId: bigint) => {
      if (isLoadingRef.current) {
        return;
      }

      if (!luminaShare.address || !ethersSigner) {
        setMessage("Missing required parameters for cancelSubscription");
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setMessage("Cancelling subscription...");

      try {
        const contract = new ethers.Contract(
          luminaShare.address,
          luminaShare.abi,
          ethersSigner
        );

        const tx = await contract.cancelSubscription(contentId);
        await tx.wait();

        setMessage("Subscription cancelled!");
      } catch (error: any) {
        setMessage(`Cancel subscription failed: ${error.message}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [luminaShare.address, luminaShare.abi, ethersSigner]
  );

  return {
    contractAddress: luminaShare.address,
    isDeployed,
    contentCount,
    isLoading,
    message,
    createContent,
    purchaseContent,
    tipContent,
    subscribe,
    cancelSubscription,
    getContent,
    checkAccess,
    getUserContentIds,
    decryptEarnings,
    refreshContentCount,
  };
};

