# LuminaShare

A privacy-preserved content sharing platform built on FHEVM (Fully Homomorphic Encryption Virtual Machine) technology. LuminaShare enables creators to monetize their content while maintaining complete privacy for payment amounts and user interactions.

## Features

- **Encrypted Payments & Tips**: All transactions are encrypted on-chain using FHEVM, protecting user privacy while maintaining blockchain transparency
- **Privacy-First Monetization**: Creators can monetize content without exposing individual payment amounts
- **Content Access Control**: Support for public, paid, and subscription-based content access
- **Transparent Yet Private**: Blockchain transparency with full privacy protection using FHEVM technology
- **Decentralized Economy**: No trusted third parties required - fully decentralized content sharing platform

## Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contracts and Hardhat configuration
│   ├── contracts/              # Solidity smart contracts
│   ├── deploy/                 # Deployment scripts
│   ├── test/                   # Contract tests
│   └── tasks/                  # Hardhat tasks
├── lumina-share-frontend/      # Next.js frontend application
│   ├── app/                    # Next.js app router pages
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── fhevm/                  # FHEVM integration utilities
│   └── abi/                    # Contract ABIs and addresses
└── frontend/                   # Reference frontend (read-only)
```

## Technology Stack

- **Smart Contracts**: Solidity with FHEVM (Fully Homomorphic Encryption)
- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Ethereum (Sepolia testnet)
- **Wallet Integration**: MetaMask with EIP-6963 support
- **Encryption**: FHEVM for homomorphic encryption operations

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for testing)

### Smart Contract Setup

1. Navigate to the contract directory:
   ```bash
   cd fhevm-hardhat-template
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   npx hardhat vars set ETHERSCAN_API_KEY  # Optional
   ```

4. Compile contracts:
   ```bash
   npx hardhat compile
   ```

5. Run tests:
   ```bash
   npx hardhat test
   ```

6. Deploy to Sepolia:
   ```bash
   npx hardhat deploy --network sepolia
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd lumina-share-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate contract ABIs and addresses:
   ```bash
   npm run genabi
   ```

4. Run development server (with mock FHEVM):
   ```bash
   npm run dev:mock
   ```

   Or run with real Relayer SDK:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Contract Addresses

### Sepolia Testnet

- **LuminaShare**: `0x337Ed3c62Bd45e1E20549a5Fa155EA8B5679C263`

## Usage

### Creating Content

1. Connect your wallet to Sepolia testnet
2. Navigate to the "Create" page
3. Fill in content details (title, content hash, type, access type, price)
4. Submit to create encrypted content on-chain

### Purchasing Content

1. Browse content on the "Explore" page
2. Click on paid content to view details
3. Enter payment amount and confirm transaction
4. Access content after successful payment

### Tipping Creators

1. Navigate to any content detail page
2. Use the tip form to send encrypted tips
3. Tips are added to creator's encrypted earnings

### Subscriptions

1. Subscribe to content with subscription access
2. Pay monthly subscription fees
3. Cancel subscription anytime

## Development

### Running Tests

```bash
cd fhevm-hardhat-template
npx hardhat test
```

### Static Export Check

```bash
cd lumina-share-frontend
npm run check:static
```

### Building Frontend

```bash
cd lumina-share-frontend
npm run build
```

The static export will be generated in the `out/` directory.

## Deployment

The frontend is configured for static export and can be deployed to any static hosting service (Vercel, Netlify, etc.).

### Vercel Deployment

The project includes `vercel.json` configuration for Vercel deployment. Deploy using:

```bash
cd lumina-share-frontend
vercel --prod
```

## License

See LICENSE files in respective directories.

## Contributing

This is a demonstration project showcasing FHEVM capabilities for privacy-preserved content monetization.

## Acknowledgments

- Built with [FHEVM](https://docs.zama.ai/protocol) by Zama
- Uses [Hardhat](https://hardhat.org/) for smart contract development
- Frontend built with [Next.js](https://nextjs.org/)



