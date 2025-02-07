# Solana Trading Bot

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

2. The bot will:
- Monitor specified wallets for token transactions
- Track token minting and burning operations
- Execute copy trades when threshold conditions are met
- Provide real-time logging of activities

## Testing

Run different test scenarios:
```bash
npm run test:case1  # Test scenario 1
npm run test:case2  # Test scenario 2
npm run test:case3  # Test scenario 3
npm run test:case4  # Test scenario 4
```

## Project Structure

- `index.js` - Main entry point and bot initialization
- `trade-monitor.js` - Core trading bot logic and wallet monitoring
- `token-manager.js` - Token creation and management
- `wallets.js` - Wallet management utilities
- `config.js` - Bot configuration
- `initialize.js` - Setup and initialization script

## Security Considerations

- Store wallet keys securely
- Test thoroughly on devnet before mainnet deployment
- Monitor wallet balances regularly
- Keep SOL balance for transaction fees
- Review copy trade logic and thresholds

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Author

[ysskrishna](https://github.com/ysskrishna)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Support

For support, please open an issue in the [GitHub repository](https://github.com/ysskrishna/solana-trading-bot/issues).
