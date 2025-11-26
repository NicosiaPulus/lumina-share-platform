import { ContentDetailClient } from "./ContentDetailClient";

interface PageProps {
  params: Promise<{ contentId: string }>;
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { contentId } = await params;
  return <ContentDetailClient contentId={contentId} />;
}

export async function generateStaticParams() {
  // Static export requires generateStaticParams to return actual params
  // This is a build-time requirement - all pages must be pre-generated
  
  // Note: In production, you should populate this with actual content IDs by:
  // 1. Connecting to the chain at build time (if RPC endpoint is available)
  // 2. Calling getContentCount() on the deployed LuminaShare contract
  // 3. Generating params: Array.from({ length: count }, (_, i) => ({ contentId: i.toString() }))
  //
  // Example implementation:
  // const { ethers } = await import("ethers");
  // const { LuminaShareAddresses } = await import("@/abi/LuminaShareAddresses");
  // const { LuminaShareABI } = await import("@/abi/LuminaShareABI");
  // const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  // const address = LuminaShareAddresses["31337"]?.address;
  // if (address && address !== ethers.ZeroAddress) {
  //   const contract = new ethers.Contract(address, LuminaShareABI.abi, provider);
  //   const count = await contract.getContentCount();
  //   return Array.from({ length: Number(count) }, (_, i) => ({ contentId: i.toString() }));
  // }
  
  // For static export, we must return at least one param to satisfy build requirement
  // This is a minimal placeholder - actual content pages should be generated
  // by connecting to the chain during build time
  return [{ contentId: "0" }];
}
