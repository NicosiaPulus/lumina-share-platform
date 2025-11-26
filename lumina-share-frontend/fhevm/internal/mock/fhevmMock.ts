//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider, Contract } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  
  // v0.3.0: 动态查询 EIP712 domain（必需，否则 createEncryptedInput 会断言失败）
  // MockFhevmInstance.createEncryptedInput 会检查：
  // 1. verifyingContractAddressInputVerification === InputVerifier.eip712Domain.verifyingContract
  // 2. gatewayChainId === InputVerifier.eip712Domain.chainId
  let verifyingContractAddressInputVerification: `0x${string}`;
  let verifyingContractAddressDecryption: `0x${string}`;
  let gatewayChainId: number;
  
  try {
    // v0.3.0: 动态查询 InputVerifier 合约的 EIP712 domain（必需）
    const inputVerifierContract = new Contract(
      parameters.metadata.InputVerifierAddress,
      ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
      provider
    );
    const inputVerifierDomain = await inputVerifierContract.eip712Domain();
    verifyingContractAddressInputVerification = inputVerifierDomain[4] as `0x${string}`; // index 4: verifyingContract address
    gatewayChainId = Number(inputVerifierDomain[3]); // index 3: chainId（必须使用这个值）
    
    console.log("[fhevmMockCreateInstance] InputVerifier EIP712 domain chainId:", gatewayChainId);
    console.log("[fhevmMockCreateInstance] InputVerifier EIP712 verifyingContract:", verifyingContractAddressInputVerification);
  } catch (error) {
    console.error("[fhevmMockCreateInstance] Failed to query InputVerifier EIP712 domain (required):", error);
    throw new Error(`Failed to query InputVerifier EIP712 domain: ${error}`);
  }
  
  try {
    // v0.3.0: 动态查询 KMSVerifier 合约的 EIP712 domain
    const kmsVerifierContract = new Contract(
      parameters.metadata.KMSVerifierAddress,
      ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
      provider
    );
    const kmsVerifierDomain = await kmsVerifierContract.eip712Domain();
    verifyingContractAddressDecryption = kmsVerifierDomain[4] as `0x${string}`; // index 4: verifyingContract address
    const kmsVerifierChainId = Number(kmsVerifierDomain[3]); // index 3: chainId
    
    console.log("[fhevmMockCreateInstance] KMSVerifier EIP712 domain chainId:", kmsVerifierChainId);
    console.log("[fhevmMockCreateInstance] KMSVerifier EIP712 verifyingContract:", verifyingContractAddressDecryption);
  } catch (error) {
    console.warn("[fhevmMockCreateInstance] Failed to query KMSVerifier EIP712 domain, using default:", error);
    // 如果查询失败，使用默认值
    verifyingContractAddressDecryption = "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64";
  }
  
  console.log("[fhevmMockCreateInstance] Creating MockFhevmInstance with config:", {
    aclContractAddress: parameters.metadata.ACLAddress,
    chainId: parameters.chainId,
    gatewayChainId,
    inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
    kmsContractAddress: parameters.metadata.KMSVerifierAddress,
    verifyingContractAddressDecryption,
    verifyingContractAddressInputVerification,
  });
  
  try {
    const instance = await MockFhevmInstance.create(
      provider, 
      provider, 
      {
        aclContractAddress: parameters.metadata.ACLAddress,
        chainId: parameters.chainId,
        gatewayChainId,
        inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
        kmsContractAddress: parameters.metadata.KMSVerifierAddress,
        verifyingContractAddressDecryption,
        verifyingContractAddressInputVerification,
      },
      {
        // v0.3.0: 新增的第 4 个参数
        inputVerifierProperties: {},
        kmsVerifierProperties: {},
      }
    );
    
    console.log("[fhevmMockCreateInstance] ✅ Mock FHEVM instance created successfully");
    return instance as unknown as FhevmInstance;
  } catch (error) {
    console.error("[fhevmMockCreateInstance] Failed to create MockFhevmInstance:", error);
    throw error;
  }
};

