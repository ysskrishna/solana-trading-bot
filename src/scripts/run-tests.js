require('module-alias/register');

const { loadWalletByWalletId } = require('@src/core/wallets');
const { TokenManager } = require('@src/core/token-manager');
const { Config, tokenAuthorityMap } = require('@src/core/config');
const logger = require('@src/core/logger');

class TestRunner {
    constructor() {
        this.tokenManager = new TokenManager();
    }

    async runTest(testCase) {
        logger.info(`Running Test Case ${testCase}:`);
        const transactions = this.getTestTransactions(testCase);
        await this.executeTestTransactions(transactions);
    }

    getTestTransactions(testCase) {
        switch(testCase) {
            case '1':
                return [
                    { time: 10, walletId: 'wallet1', action: 'buy', amount: 0.4, token: Config.xyzToken },
                    { time: 14, walletId: 'wallet1', action: 'buy', amount: 0.2, token: Config.xyzToken },
                    { time: 18, walletId: 'wallet1', action: 'sell', amount: 0.5, token: Config.xyzToken },
                    { time: 20, walletId: 'wallet1', action: 'buy', amount: 0.2, token: Config.abcToken },
                    { time: 26, walletId: 'wallet2', action: 'buy', amount: 0.05, token: Config.xyzToken },
                    { time: 30, walletId: 'wallet2', action: 'buy', amount: 0.15, token: Config.abcToken }
                ];
            case '2':
                return [
                    { time: 10, walletId: 'wallet1', action: 'buy', amount: 0.4, token: Config.xyzToken },
                    { time: 14, walletId: 'wallet2', action: 'buy', amount: 0.2, token: Config.xyzToken }
                ];
            case '3':
                // simplified test case of case 1, with smaller amounts
                return [
                    { time: 2, walletId: 'wallet1', action: 'buy', amount: 0.004, token: Config.xyzToken },
                    { time: 6, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.xyzToken },
                    { time: 10, walletId: 'wallet1', action: 'sell', amount: 0.005, token: Config.xyzToken },
                    { time: 12, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.abcToken },
                    { time: 18, walletId: 'wallet2', action: 'buy', amount: 0.0005, token: Config.xyzToken },
                    { time: 22, walletId: 'wallet2', action: 'buy', amount: 0.0015, token: Config.abcToken }
                ];
            case '4':
                // simplified test case of case 2, with smaller amounts
                return [
                    { time: 2, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.xyzToken },
                    { time: 6, walletId: 'wallet2', action: 'buy', amount: 0.001, token: Config.xyzToken }
                ];
            default:
                throw new Error('Invalid test case number');
        }
    }

    async executeTestTransactions(transactions) {
        let startTime = Date.now();

        for (const tx of transactions) {
            const wallet = await loadWalletByWalletId(tx.walletId);
            const mintAuthorityWallet = await loadWalletByWalletId(tokenAuthorityMap[tx.token]);

            const timeToWait = (tx.time * 60 * 1000) - (Date.now() - startTime);

            if (timeToWait > 0) {
                logger.info(`Waiting ${timeToWait/1000} seconds for next transaction...`);
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }

            logger.info(`Executing ${tx.action} transaction for ${tx.walletId}...`);
            await this.tokenManager.executeTokenTransaction(
                wallet,
                tx.token,
                tx.action,
                mintAuthorityWallet,
                tx.amount
            );            
            logger.info(`Successfully executed ${tx.action} transaction for ${tx.walletId}`);
        }
    }
}

async function main() {
    const testCase = process.argv[2];
    if (!testCase || !['1', '2', '3', '4'].includes(testCase)) {
        logger.error('Please specify a test case number (1, 2, 3, or 4)');
        logger.info('Usage: node run-tests.js <test-case-number>');
        process.exit(1);
    }

    const testRunner = new TestRunner();

    try {
        await testRunner.runTest(testCase);
        logger.info('Test transactions completed successfully');
    } catch (error) {
        logger.error('Error running test:', error);
        process.exit(1);
    }
}

// Handle any unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

// Run the tests
main().catch((error) => {
    logger.error('Test execution failed:', error);
}); 