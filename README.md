# Solana Trading Bot

[![License: AGPL-3.0](https://img.shields.io/github/license/ysskrishna/solana-trading-bot)](https://github.com/ysskrishna/solana-trading-bot/blob/main/LICENSE) [![Author site](https://img.shields.io/badge/author-ysskrishna.space-informational)](https://ysskrishna.space)

A sophisticated trading bot for Solana that monitors wallet activities and performs copy trading based on configurable thresholds. The bot watches specified wallets for token transactions and automatically executes similar trades when certain conditions are met.

## Features

- Real-time monitoring of multiple Solana wallets
- Automated copy trading based on configurable thresholds
- Support for SPL tokens
- Automatic Associated Token Account (ATA) creation and management
- Configurable time windows for trade analysis
- Detailed transaction logging and balance tracking
- Support for both buying (minting) and selling (burning) tokens
- Devnet support for testing and development

## Prerequisites

- Node.js (v18 or higher)
- NPM (Node Package Manager)
- Basic understanding of Solana blockchain and SPL tokens

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ysskrishna/solana-trading-bot.git
cd solana-trading-bot
```

2. Install dependencies:
```bash
npm install
```

## Setup

1. Initialize the environment (creates wallets and test token):
```bash
npm run initialize
```

This will:
- Create monitoring wallets (wallet1, wallet2, wallet3)
- Create a copier wallet for executing trades
- Request airdrops for initial testing
- Create a test token with wallet1 as the creator

## Usage

1. Start the trading bot:
```bash
npm start
```

The bot will:
- Monitor specified wallets for token transactions
- Track token minting and burning operations
- Execute copy trades when threshold conditions are met
- Provide real-time logging of activities

2. To run test scenarios, use the following commands and run it in seperate terminal:
```bash
npm run test:case1  # Test scenario 1
npm run test:case2  # Test scenario 2
npm run test:case3  # Test scenario 3
npm run test:case4  # Test scenario 4
```

> **Note**: Ensure the main trading bot is running before executing any test scenarios.

## Project Structure

```
solana-trading-bot/
├── src/                    # Source code files
│   ├── core/              # Core functionality
│   │   ├── trade-monitor.js  # Trade monitoring logic
│   │   ├── token-manager.js  # Token management
│   │   ├── wallets.js       # Wallet operations
│   │   ├── logger.js        # Logging functionality
│   │   └── config.js        # Application configuration
│   └── scripts/           # Utility scripts
│       ├── initialize.js   # Setup script
│       └── run-tests.js   # Test runner
├── data/                  # Data storage
│   ├── wallets/          # Wallet files
│   └── tokens/           # Token configuration
├── logs/                 # Application logs
│   └── app.log          # Main log file
├── index.js             # Application entry point
├── package.json         # Project metadata and dependencies
└── README.md          # Project documentation
```

The project is organized into logical modules:

- `src/`: Contains all source code
  - `core/`: Core business logic modules and configuration
  - `scripts/`: Utility scripts
- `data/`: Data storage for wallets and tokens
- `logs/`: Application logging directory

## Security Considerations

- Store wallet keys securely
- Wallet files in `data/wallets/` are local. Create them with `npm run initialize`. They are gitignored and must not be committed.
- Test thoroughly on devnet before mainnet deployment
- Monitor wallet balances regularly
- Keep SOL balance for transaction fees
- Review copy trade logic and thresholds

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Built and maintained by

Solana Trading Bot is built and maintained by:

| | Name | GitHub | Role |
|---|------|--------|------|
| <img src="https://github.com/ysskrishna.png?size=120" width="60" height="60" alt="Y. Siva Sai Krishna"> | **Y. Siva Sai Krishna** | [@ysskrishna](https://github.com/ysskrishna) | Creator |

## Support

If you find this project helpful:

- ⭐ Star the repository
- 🐛 [Report issues](https://github.com/ysskrishna/solana-trading-bot/issues)
- 🔀 Submit pull requests
- 💝 [Sponsor on GitHub](https://github.com/sponsors/ysskrishna)

## License

AGPL-3.0 © [Y. Siva Sai Krishna](https://github.com/ysskrishna) — see [LICENSE](LICENSE) for details.

---

<p align="left">
  <a href="https://github.com/ysskrishna">Author's GitHub</a> •
  <a href="https://linkedin.com/in/ysskrishna">Author's LinkedIn</a> •
  <a href="https://ysskrishna.space">Author's site</a> •
  <a href="https://github.com/ysskrishna/solana-trading-bot/issues">Report Issues</a>
</p>
