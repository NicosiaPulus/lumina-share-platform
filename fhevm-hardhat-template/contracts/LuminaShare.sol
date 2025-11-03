// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title LuminaShare - Privacy-Preserved Content Sharing Platform
/// @author LuminaShare Team
/// @notice A FHEVM-based platform for encrypted content monetization and tipping
/// @dev Uses FHEVM for homomorphic encryption of payment amounts and user data

contract LuminaShare is ZamaEthereumConfig {
    // ============ Enums ============
    enum ContentType {
        Article,
        Video,
        Music,
        Other
    }

    enum AccessType {
        Public,
        Paid,
        Subscription
    }

    enum TipType {
        OneTime,
        TimeBased,
        ViewBased
    }

    // ============ Structs ============
    struct Content {
        address creator;
        string title;
        string contentHash; // IPFS hash or content URL
        ContentType contentType;
        AccessType accessType;
        euint32 price; // Encrypted price (for Paid/Subscription)
        euint32 earnings; // Encrypted total earnings
        euint32 viewCount; // Encrypted view count
        euint32 tipCount; // Encrypted tip count
        uint256 createdAt;
        bool active;
    }

    struct Subscription {
        uint256 contentId;
        address subscriber;
        euint32 monthlyFee; // Encrypted monthly fee
        uint256 expiresAt;
        bool autoRenew;
        bool active;
    }

    struct Payment {
        uint256 contentId;
        address payer;
        euint32 amount; // Encrypted payment amount
        uint256 timestamp;
    }

    struct Tip {
        uint256 contentId;
        address tipper;
        euint32 amount; // Encrypted tip amount
        TipType tipType;
        uint256 timestamp;
    }

    // ============ State Variables ============
    uint256 private _contentCounter;
    mapping(uint256 => Content) public contents;
    mapping(uint256 => mapping(address => bool)) public hasAccess; // contentId => user => hasAccess
    mapping(uint256 => mapping(address => Subscription)) public subscriptions; // contentId => subscriber => Subscription
    mapping(address => euint32) public creatorEarnings; // creator => encrypted total earnings
    mapping(address => euint32) public creatorEarningsByTips; // creator => encrypted tips earnings
    mapping(address => euint32) public creatorEarningsByPayments; // creator => encrypted payments earnings
    mapping(address => euint32) public creatorEarningsBySubscriptions; // creator => encrypted subscriptions earnings
    mapping(uint256 => Payment[]) public payments; // contentId => Payment[]
    mapping(uint256 => Tip[]) public tips; // contentId => Tip[]
    mapping(address => uint256[]) public userContentIds; // creator => contentId[]
    mapping(address => uint256[]) public userSubscriptions; // subscriber => contentId[]

    // ============ Events ============
    event ContentCreated(
        uint256 indexed contentId,
        address indexed creator,
        string title,
        ContentType contentType,
        AccessType accessType
    );

    event ContentPurchased(
        uint256 indexed contentId,
        address indexed payer,
        uint256 timestamp
    );

    event ContentTipped(
        uint256 indexed contentId,
        address indexed tipper,
        TipType tipType,
        uint256 timestamp
    );

    event SubscriptionCreated(
        uint256 indexed contentId,
        address indexed subscriber,
        uint256 expiresAt,
        bool autoRenew
    );

    event SubscriptionCancelled(
        uint256 indexed contentId,
        address indexed subscriber
    );

    event SubscriptionRenewed(
        uint256 indexed contentId,
        address indexed subscriber,
        uint256 newExpiresAt
    );

    event EarningsWithdrawn(
        address indexed creator,
        uint256 decryptedAmount
    );

    // ============ Modifiers ============
    modifier contentExists(uint256 contentId) {
        require(contents[contentId].creator != address(0), "Content does not exist");
        require(contents[contentId].active, "Content is not active");
        _;
    }

    modifier onlyCreator(uint256 contentId) {
        require(contents[contentId].creator == msg.sender, "Not the creator");
        _;
    }

    // ============ Functions ============

    /// @notice Create a new content
    /// @param title Content title
    /// @param contentHash IPFS hash or content URL
    /// @param contentType Type of content (Article/Video/Music/Other)
    /// @param accessType Access type (Public/Paid/Subscription)
    /// @param encryptedPrice Encrypted price (only for Paid/Subscription)
    /// @param inputProof Input proof for encrypted price
    function createContent(
        string memory title,
        string memory contentHash,
        ContentType contentType,
        AccessType accessType,
        externalEuint32 encryptedPrice,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");

        uint256 contentId = _contentCounter++;
        euint32 price;

        if (accessType == AccessType.Paid || accessType == AccessType.Subscription) {
            price = FHE.fromExternal(encryptedPrice, inputProof);
            FHE.allowThis(price);
        }

        Content storage newContent = contents[contentId];
        newContent.creator = msg.sender;
        newContent.title = title;
        newContent.contentHash = contentHash;
        newContent.contentType = contentType;
        newContent.accessType = accessType;
        newContent.price = price;
        newContent.createdAt = block.timestamp;
        newContent.active = true;

        userContentIds[msg.sender].push(contentId);

        emit ContentCreated(contentId, msg.sender, title, contentType, accessType);
        return contentId;
    }

    /// @notice Purchase access to paid content
    /// @param contentId Content ID
    /// @param encryptedAmount Encrypted payment amount
    /// @param inputProof Input proof for encrypted amount
    function purchaseContent(
        uint256 contentId,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external contentExists(contentId) {
        Content storage content = contents[contentId];
        require(content.accessType == AccessType.Paid, "Content is not paid");
        require(!hasAccess[contentId][msg.sender], "Already has access");

        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        // Note: In FHEVM, encrypted comparison is complex. For now, we rely on frontend validation.
        // In production, this should use proper FHE comparison or require minimum payment patterns.

        // Grant access
        hasAccess[contentId][msg.sender] = true;

        // Allow this contract to use the encrypted amount
        FHE.allow(amount, address(this));

        // Add to earnings (encrypted)
        // Note: FHE.add handles uninitialized values (bytes32(0)) correctly
        content.earnings = FHE.add(content.earnings, amount);
        creatorEarnings[content.creator] = FHE.add(creatorEarnings[content.creator], amount);
        creatorEarningsByPayments[content.creator] = FHE.add(
            creatorEarningsByPayments[content.creator],
            amount
        );

        // Allow creator to decrypt earnings (after addition)
        // FHE.add results are owned by the contract, so allowThis should work
        FHE.allowThis(content.earnings);
        FHE.allow(content.earnings, content.creator);
        FHE.allowThis(creatorEarnings[content.creator]);
        FHE.allow(creatorEarnings[content.creator], content.creator);
        FHE.allowThis(creatorEarningsByPayments[content.creator]);
        FHE.allow(creatorEarningsByPayments[content.creator], content.creator);

        // Note: View count increment requires encrypted input from frontend
        // For now, view count is tracked separately

        // Record payment
        payments[contentId].push(Payment({
            contentId: contentId,
            payer: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit ContentPurchased(contentId, msg.sender, block.timestamp);
    }

    /// @notice Tip content creator
    /// @param contentId Content ID
    /// @param encryptedAmount Encrypted tip amount
    /// @param tipType Type of tip (OneTime/TimeBased/ViewBased)
    /// @param inputProof Input proof for encrypted amount
    function tipContent(
        uint256 contentId,
        externalEuint32 encryptedAmount,
        TipType tipType,
        bytes calldata inputProof
    ) external contentExists(contentId) {
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);
        Content storage content = contents[contentId];

        // Allow this contract to use the encrypted amount
        FHE.allow(amount, address(this));

        // Add to earnings (encrypted)
        content.earnings = FHE.add(content.earnings, amount);
        // Note: Tip count increment requires encrypted input from frontend
        creatorEarnings[content.creator] = FHE.add(creatorEarnings[content.creator], amount);
        creatorEarningsByTips[content.creator] = FHE.add(
            creatorEarningsByTips[content.creator],
            amount
        );

        // Allow creator to decrypt earnings (after addition)
        FHE.allowThis(content.earnings);
        FHE.allow(content.earnings, content.creator);
        FHE.allowThis(creatorEarnings[content.creator]);
        FHE.allow(creatorEarnings[content.creator], content.creator);

        // Record tip
        tips[contentId].push(Tip({
            contentId: contentId,
            tipper: msg.sender,
            amount: amount,
            tipType: tipType,
            timestamp: block.timestamp
        }));

        emit ContentTipped(contentId, msg.sender, tipType, block.timestamp);
    }

    /// @notice Subscribe to subscription content
    /// @param contentId Content ID
    /// @param encryptedFee Encrypted monthly fee
    /// @param inputProof Input proof for encrypted fee
    /// @param durationMonths Subscription duration in months
    /// @param autoRenew Whether to auto-renew subscription
    function subscribe(
        uint256 contentId,
        externalEuint32 encryptedFee,
        bytes calldata inputProof,
        uint256 durationMonths,
        bool autoRenew
    ) external contentExists(contentId) {
        Content storage content = contents[contentId];
        require(content.accessType == AccessType.Subscription, "Content is not subscription-based");

        euint32 fee = FHE.fromExternal(encryptedFee, inputProof);
        // Note: In FHEVM, encrypted comparison is complex. For now, we rely on frontend validation.
        // In production, this should use proper FHE comparison or require minimum payment patterns.

        // Allow this contract to use the encrypted fee
        FHE.allow(fee, address(this));

        uint256 expiresAt = block.timestamp + (durationMonths * 30 days);

        // Update or create subscription
        subscriptions[contentId][msg.sender] = Subscription({
            contentId: contentId,
            subscriber: msg.sender,
            monthlyFee: fee,
            expiresAt: expiresAt,
            autoRenew: autoRenew,
            active: true
        });

        // Grant access
        hasAccess[contentId][msg.sender] = true;

        // Add to earnings (encrypted)
        content.earnings = FHE.add(content.earnings, fee);
        creatorEarnings[content.creator] = FHE.add(creatorEarnings[content.creator], fee);
        creatorEarningsBySubscriptions[content.creator] = FHE.add(
            creatorEarningsBySubscriptions[content.creator],
            fee
        );

        // Allow creator to decrypt earnings (after addition)
        FHE.allowThis(content.earnings);
        FHE.allow(content.earnings, content.creator);
        FHE.allowThis(creatorEarnings[content.creator]);
        FHE.allow(creatorEarnings[content.creator], content.creator);

        // Add to user subscriptions
        userSubscriptions[msg.sender].push(contentId);

        emit SubscriptionCreated(contentId, msg.sender, expiresAt, autoRenew);
    }

    /// @notice Cancel subscription
    /// @param contentId Content ID
    function cancelSubscription(uint256 contentId) external contentExists(contentId) {
        Subscription storage subscription = subscriptions[contentId][msg.sender];
        require(subscription.active, "Subscription does not exist or is inactive");
        require(subscription.subscriber == msg.sender, "Not the subscriber");

        subscription.active = false;
        subscription.autoRenew = false;

        emit SubscriptionCancelled(contentId, msg.sender);
    }

    /// @notice Renew subscription (can be called by anyone if auto-renew is enabled)
    /// @param contentId Content ID
    /// @param subscriber Subscriber address
    /// @param encryptedFee Encrypted renewal fee
    /// @param inputProof Input proof for encrypted fee
    function renewSubscription(
        uint256 contentId,
        address subscriber,
        externalEuint32 encryptedFee,
        bytes calldata inputProof
    ) external contentExists(contentId) {
        Subscription storage subscription = subscriptions[contentId][subscriber];
        require(subscription.active, "Subscription is not active");
        require(
            subscription.autoRenew || msg.sender == subscriber,
            "Cannot renew subscription"
        );

        euint32 fee = FHE.fromExternal(encryptedFee, inputProof);
        Content storage content = contents[contentId];
        // Note: In FHEVM, encrypted comparison is complex. For now, we rely on frontend validation.
        // In production, this should use proper FHE comparison or require minimum payment patterns.

        // Allow this contract to use the encrypted fee
        FHE.allow(fee, address(this));

        // Extend subscription by 1 month
        subscription.expiresAt = subscription.expiresAt + 30 days;

        // Add to earnings (encrypted)
        content.earnings = FHE.add(content.earnings, fee);
        creatorEarnings[content.creator] = FHE.add(creatorEarnings[content.creator], fee);
        creatorEarningsBySubscriptions[content.creator] = FHE.add(
            creatorEarningsBySubscriptions[content.creator],
            fee
        );

        // Allow creator to decrypt earnings (after addition)
        FHE.allowThis(content.earnings);
        FHE.allow(content.earnings, content.creator);
        FHE.allowThis(creatorEarnings[content.creator]);
        FHE.allow(creatorEarnings[content.creator], content.creator);

        emit SubscriptionRenewed(contentId, subscriber, subscription.expiresAt);
    }

    /// @notice Check if user has access to content
    /// @param contentId Content ID
    /// @param user User address
    /// @return hasAccess Whether user has access
    function checkAccess(uint256 contentId, address user) external view contentExists(contentId) returns (bool) {
        Content storage content = contents[contentId];

        if (content.accessType == AccessType.Public) {
            return true;
        }

        if (content.accessType == AccessType.Paid) {
            return hasAccess[contentId][user];
        }

        if (content.accessType == AccessType.Subscription) {
            Subscription storage subscription = subscriptions[contentId][user];
            return subscription.active && subscription.expiresAt > block.timestamp;
        }

        return false;
    }

    /// @notice Record content view (increment view count)
    /// @param contentId Content ID
    /// @dev Note: View count increment requires encrypted input from frontend
    /// For now, view count is tracked via events or off-chain
    function recordView(uint256 contentId) external view contentExists(contentId) {
        // Note: View count increment requires encrypted input from frontend
        // For now, view count is tracked via events or off-chain
        // This is a placeholder function that can be implemented later
    }

    /// @notice Get content earnings (encrypted)
    /// @param contentId Content ID
    /// @return earnings Encrypted earnings
    function getContentEarnings(uint256 contentId) external view contentExists(contentId) returns (euint32) {
        return contents[contentId].earnings;
    }

    /// @notice Get creator total earnings (encrypted)
    /// @param creator Creator address
    /// @return earnings Encrypted total earnings
    function getCreatorEarnings(address creator) external view returns (euint32) {
        return creatorEarnings[creator];
    }

    /// @notice Get creator earnings by type (encrypted)
    /// @param creator Creator address
    /// @return tipsEarnings Encrypted tips earnings
    /// @return paymentsEarnings Encrypted payments earnings
    /// @return subscriptionsEarnings Encrypted subscriptions earnings
    function getCreatorEarningsByType(address creator)
        external
        view
        returns (euint32 tipsEarnings, euint32 paymentsEarnings, euint32 subscriptionsEarnings)
    {
        return (
            creatorEarningsByTips[creator],
            creatorEarningsByPayments[creator],
            creatorEarningsBySubscriptions[creator]
        );
    }

    /// @notice Authorize decryption of earnings (for relayer)
    /// @param contentId Content ID (0 for total earnings)
    function authorizeDecrypt(uint256 contentId) external {
        if (contentId == 0) {
            // Authorize total earnings
            // Note: Earnings should already be allowed to this contract during add operations
            // Just allow to the user for decryption
            euint32 earnings = creatorEarnings[msg.sender];
            FHE.allow(earnings, msg.sender);
        } else {
            // Authorize content earnings
            require(contents[contentId].creator == msg.sender, "Not the creator");
            // Note: Earnings should already be allowed to this contract during add operations
            // Just allow to the user for decryption
            euint32 earnings = contents[contentId].earnings;
            FHE.allow(earnings, msg.sender);
        }
    }

    /// @notice Withdraw earnings (after decryption by relayer)
    /// @param decryptedAmount Decrypted amount to withdraw
    function withdraw(uint256 decryptedAmount) external {
        require(decryptedAmount > 0, "Amount must be greater than 0");
        // Note: In a real implementation, this would transfer tokens from the contract
        // For now, this is a placeholder that emits an event
        // The actual token transfer should be handled by the frontend/relayer
        emit EarningsWithdrawn(msg.sender, decryptedAmount);
    }

    /// @notice Get content count
    /// @return count Total number of contents
    function getContentCount() external view returns (uint256) {
        return _contentCounter;
    }

    /// @notice Get user's content IDs
    /// @param creator Creator address
    /// @return contentIds Array of content IDs
    function getUserContentIds(address creator) external view returns (uint256[] memory) {
        return userContentIds[creator];
    }

    /// @notice Get user's subscriptions
    /// @param subscriber Subscriber address
    /// @return contentIds Array of subscribed content IDs
    function getUserSubscriptions(address subscriber) external view returns (uint256[] memory) {
        return userSubscriptions[subscriber];
    }

    /// @notice Get payment count for content
    /// @param contentId Content ID
    /// @return count Number of payments
    function getPaymentCount(uint256 contentId) external view contentExists(contentId) returns (uint256) {
        return payments[contentId].length;
    }

    /// @notice Get tip count for content
    /// @param contentId Content ID
    /// @return count Number of tips
    function getTipCount(uint256 contentId) external view contentExists(contentId) returns (uint256) {
        return tips[contentId].length;
    }
}

