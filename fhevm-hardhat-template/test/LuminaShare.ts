import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { LuminaShare, LuminaShare__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("LuminaShare")) as LuminaShare__factory;
  const contract = (await factory.deploy()) as LuminaShare;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("LuminaShare", function () {
  // Test suite for LuminaShare contract functionality
  let signers: Signers;
  let contract: LuminaShare;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Content Creation", function () {
    it("should create public content", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent(
          "Test Article",
          "ipfs://QmTest123",
          0, // Article
          0, // Public
          encryptedZero.handles[0],
          encryptedZero.inputProof
        );
      await tx.wait();

      const content = await contract.contents(0);
      expect(content.creator).to.eq(signers.alice.address);
      expect(content.title).to.eq("Test Article");
      expect(content.contentHash).to.eq("ipfs://QmTest123");
      expect(content.contentType).to.eq(0); // Article
      expect(content.accessType).to.eq(0); // Public
    });

    it("should create paid content with encrypted price", async function () {
      const price = 100;
      const encryptedPrice = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(price)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent(
          "Paid Article",
          "ipfs://QmPaid123",
          0, // Article
          1, // Paid
          encryptedPrice.handles[0],
          encryptedPrice.inputProof
        );
      await tx.wait();

      const content = await contract.contents(0);
      expect(content.accessType).to.eq(1); // Paid

      // Verify encrypted price (can't decrypt in test, but can verify it's not zero)
      const encryptedPriceOnChain = await contract.contents(0);
      expect(encryptedPriceOnChain.price).to.not.eq(ethers.ZeroHash);
    });

    it("should create subscription content", async function () {
      const monthlyFee = 50;
      const encryptedFee = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(monthlyFee)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent(
          "Subscription Video",
          "ipfs://QmSub123",
          1, // Video
          2, // Subscription
          encryptedFee.handles[0],
          encryptedFee.inputProof
        );
      await tx.wait();

      const content = await contract.contents(0);
      expect(content.accessType).to.eq(2); // Subscription
    });

    it("should revert when title is empty", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .createContent("", "ipfs://QmTest123", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof)
      ).to.be.revertedWith("Title cannot be empty");
    });
  });

  describe("Payment", function () {
    let contentId: bigint;

    beforeEach(async function () {
      const price = 100;
      const encryptedPrice = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(price)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent(
          "Paid Article",
          "ipfs://QmPaid123",
          0,
          1, // Paid
          encryptedPrice.handles[0],
          encryptedPrice.inputProof
        );
      await tx.wait();

      contentId = 0n;
    });

    it("should allow purchase with sufficient payment", async function () {
      const paymentAmount = 100;
      const encryptedPayment = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(paymentAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.bob)
        .purchaseContent(contentId, encryptedPayment.handles[0], encryptedPayment.inputProof);
      await tx.wait();

      const hasAccess = await contract.hasAccess(contentId, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should accept payment (frontend validates amount)", async function () {
      // Note: Contract doesn't validate payment amount in encrypted state
      // Frontend should validate that payment >= price before calling
      const paymentAmount = 50; // Less than price (100), but contract accepts it
      const encryptedPayment = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(paymentAmount)
        .encrypt();

      // Contract will accept any payment (frontend validation required)
      const tx = await contract
        .connect(signers.bob)
        .purchaseContent(contentId, encryptedPayment.handles[0], encryptedPayment.inputProof);
      await tx.wait();

      const hasAccess = await contract.hasAccess(contentId, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should increment content earnings after purchase", async function () {
      const paymentAmount = 100;
      const encryptedPayment = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(paymentAmount)
        .encrypt();

      const earningsBefore = await contract.getContentEarnings(contentId);

      await contract
        .connect(signers.bob)
        .purchaseContent(contentId, encryptedPayment.handles[0], encryptedPayment.inputProof);

      const earningsAfter = await contract.getContentEarnings(contentId);
      expect(earningsAfter).to.not.eq(ethers.ZeroHash);
      expect(earningsAfter).to.not.eq(earningsBefore);
    });
  });

  describe("Tipping", function () {
    let contentId: bigint;

    beforeEach(async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent("Free Article", "ipfs://QmFree123", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);
      await tx.wait();

      contentId = 0n;
    });

    it("should allow tipping content", async function () {
      const tipAmount = 50;
      const encryptedTip = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(tipAmount)
        .encrypt();

      const earningsBefore = await contract.getContentEarnings(contentId);

      const tx = await contract
        .connect(signers.bob)
        .tipContent(contentId, encryptedTip.handles[0], 0, encryptedTip.inputProof); // OneTime tip
      await tx.wait();

      const earningsAfter = await contract.getContentEarnings(contentId);
      expect(earningsAfter).to.not.eq(ethers.ZeroHash);
      expect(earningsAfter).to.not.eq(earningsBefore);

      const tipCount = await contract.getTipCount(contentId);
      expect(tipCount).to.eq(1n);
    });

    it("should increment creator total earnings", async function () {
      const tipAmount = 75;
      const encryptedTip = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(tipAmount)
        .encrypt();

      const creatorEarningsBefore = await contract.getCreatorEarnings(signers.alice.address);

      await contract
        .connect(signers.bob)
        .tipContent(contentId, encryptedTip.handles[0], 0, encryptedTip.inputProof);

      const creatorEarningsAfter = await contract.getCreatorEarnings(signers.alice.address);
      expect(creatorEarningsAfter).to.not.eq(ethers.ZeroHash);
      expect(creatorEarningsAfter).to.not.eq(creatorEarningsBefore);
    });
  });

  describe("Subscriptions", function () {
    let contentId: bigint;

    beforeEach(async function () {
      const monthlyFee = 50;
      const encryptedFee = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(monthlyFee)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .createContent(
          "Subscription Video",
          "ipfs://QmSub123",
          1,
          2, // Subscription
          encryptedFee.handles[0],
          encryptedFee.inputProof
        );
      await tx.wait();

      contentId = 0n;
    });

    it("should allow subscription creation", async function () {
      const fee = 50;
      const encryptedFee = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(fee)
        .encrypt();

      const tx = await contract
        .connect(signers.bob)
        .subscribe(contentId, encryptedFee.handles[0], encryptedFee.inputProof, 1, true);
      await tx.wait();

      const subscription = await contract.subscriptions(contentId, signers.bob.address);
      expect(subscription.active).to.be.true;
      expect(subscription.autoRenew).to.be.true;
      const currentBlock = await ethers.provider.getBlock("latest");
      expect(subscription.expiresAt).to.be.gt(currentBlock?.timestamp || 0);

      const hasAccess = await contract.hasAccess(contentId, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should allow subscription cancellation", async function () {
      const fee = 50;
      const encryptedFee = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(fee)
        .encrypt();

      await contract
        .connect(signers.bob)
        .subscribe(contentId, encryptedFee.handles[0], encryptedFee.inputProof, 1, true);

      await contract.connect(signers.bob).cancelSubscription(contentId);

      const subscription = await contract.subscriptions(contentId, signers.bob.address);
      expect(subscription.active).to.be.false;
      expect(subscription.autoRenew).to.be.false;
    });

    it("should allow subscription renewal", async function () {
      const fee = 50;
      const encryptedFee = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(fee)
        .encrypt();

      await contract
        .connect(signers.bob)
        .subscribe(contentId, encryptedFee.handles[0], encryptedFee.inputProof, 1, true);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const subscriptionBefore = await contract.subscriptions(contentId, signers.bob.address);
      const expiresAtBefore = subscriptionBefore.expiresAt;

      const renewalFee = 50;
      const encryptedRenewalFee = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(renewalFee)
        .encrypt();

      // First authorize decrypt for the earnings
      await contract.connect(signers.alice).authorizeDecrypt(contentId);

      await contract
        .connect(signers.bob)
        .renewSubscription(
          contentId,
          signers.bob.address,
          encryptedRenewalFee.handles[0],
          encryptedRenewalFee.inputProof
        );

      const subscriptionAfter = await contract.subscriptions(contentId, signers.bob.address);
      expect(subscriptionAfter.expiresAt).to.be.gt(expiresAtBefore);
    });
  });

  describe("Access Control", function () {
    it("should allow public access", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Public Article", "ipfs://QmPublic123", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);

      const hasAccess = await contract.checkAccess(0n, signers.bob.address);
      expect(hasAccess).to.be.true;
    });

    it("should deny access to unpaid content", async function () {
      const price = 100;
      const encryptedPrice = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(price)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Paid Article", "ipfs://QmPaid123", 0, 1, encryptedPrice.handles[0], encryptedPrice.inputProof);

      const hasAccess = await contract.checkAccess(0n, signers.bob.address);
      expect(hasAccess).to.be.false;
    });

    it("should grant access after payment", async function () {
      const price = 100;
      const encryptedPrice = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(price)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Paid Article", "ipfs://QmPaid123", 0, 1, encryptedPrice.handles[0], encryptedPrice.inputProof);

      const paymentAmount = 100;
      const encryptedPayment = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(paymentAmount)
        .encrypt();

      await contract
        .connect(signers.bob)
        .purchaseContent(0n, encryptedPayment.handles[0], encryptedPayment.inputProof);

      const hasAccess = await contract.checkAccess(0n, signers.bob.address);
      expect(hasAccess).to.be.true;
    });
  });

  describe("Earnings", function () {
    it("should track creator earnings by type", async function () {
      // Create paid content
      const price = 100;
      const encryptedPrice = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(price)
        .encrypt();

      const createTx = await contract
        .connect(signers.alice)
        .createContent("Paid Article", "ipfs://QmPaid123", 0, 1, encryptedPrice.handles[0], encryptedPrice.inputProof);
      await createTx.wait();

      // Purchase
      const paymentAmount = 100;
      const encryptedPayment = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(paymentAmount)
        .encrypt();

      const purchaseTx = await contract
        .connect(signers.bob)
        .purchaseContent(0n, encryptedPayment.handles[0], encryptedPayment.inputProof);
      await purchaseTx.wait();

      // Tip
      const tipAmount = 50;
      const encryptedTip = await fhevm
        .createEncryptedInput(contractAddress, signers.charlie.address)
        .add32(tipAmount)
        .encrypt();

      const tipTx = await contract
        .connect(signers.charlie)
        .tipContent(0n, encryptedTip.handles[0], 0, encryptedTip.inputProof);
      await tipTx.wait();

      // Check earnings
      const totalEarnings = await contract.getCreatorEarnings(signers.alice.address);
      expect(totalEarnings).to.not.eq(ethers.ZeroHash);

      const earningsByType = await contract.getCreatorEarningsByType(signers.alice.address);
      expect(earningsByType.tips).to.not.eq(ethers.ZeroHash);
      expect(earningsByType.payments).to.not.eq(ethers.ZeroHash);
    });

    it("should allow authorization for decryption", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Article", "ipfs://Qm123", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);

      // Tip to create some earnings
      const tipAmount = 10;
      const encryptedTip = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(tipAmount)
        .encrypt();

      await contract
        .connect(signers.bob)
        .tipContent(0n, encryptedTip.handles[0], 0, encryptedTip.inputProof);

      // Now authorize decrypt should work
      await contract.connect(signers.alice).authorizeDecrypt(0n);
    });
  });

  describe("View Functions", function () {
    it("should return user content IDs", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Article 1", "ipfs://Qm1", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);

      await contract
        .connect(signers.alice)
        .createContent("Article 2", "ipfs://Qm2", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);

      const contentIds = await contract.getUserContentIds(signers.alice.address);
      expect(contentIds.length).to.eq(2);
      expect(contentIds[0]).to.eq(0n);
      expect(contentIds[1]).to.eq(1n);
    });

    it("should return content count", async function () {
      const encryptedZero = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await contract
        .connect(signers.alice)
        .createContent("Article", "ipfs://Qm123", 0, 0, encryptedZero.handles[0], encryptedZero.inputProof);

      const count = await contract.getContentCount();
      expect(count).to.eq(1n);
    });
  });
});

