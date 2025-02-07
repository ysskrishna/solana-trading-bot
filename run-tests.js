const { TradeMonitor } = require('./trade-monitor');
const { Config } = require('./config');
const { TokenManager } = require('./token-manager');

class TestRunner {
    constructor(tradeMonitor) {
        this.tradeMonitor = tradeMonitor;
        this.tokenManager = new TokenManager();
    }

    async runTest(testCase) {
        console.log(`\nRunning Test Case ${testCase}:`);
        const transactions = this.getTestTransactions(testCase);
        await this.executeTestTransactions(transactions);
    }

    getTestTransactions(testCase) {
        switch(testCase) {
            case '1':
                return [
                    { time: 10, walletId: 'wallet1', action: 'buy', amount: 0.4, token: Config.tokenName },
                    { time: 14, walletId: 'wallet1', action: 'buy', amount: 0.2, token: Config.tokenName },
                    { time: 18, walletId: 'wallet1', action: 'sell', amount: 0.5, token: Config.tokenName },
                    { time: 20, walletId: 'wallet1', action: 'buy', amount: 0.2, token: Config.tokenName },
                    { time: 26, walletId: 'wallet2', action: 'buy', amount: 0.05, token: Config.tokenName },
                    { time: 30, walletId: 'wallet2', action: 'buy', amount: 0.15, token: Config.tokenName }
                ];
            case '2':
                return [
                    { time: 10, walletId: 'wallet1', action: 'buy', amount: 0.4, token: Config.tokenName },
                    { time: 14, walletId: 'wallet2', action: 'buy', amount: 0.2, token: Config.tokenName }
                ];
            default:
                throw new Error('Invalid test case number');
        }
    }

    async executeTestTransactions(transactions) {
        const mintAuthorityWallet = this.tradeMonitor.wallets["wallet1"];

        let startTime = Date.now();
        for (const tx of transactions) {
            const wallet = this.tradeMonitor.wallets[tx.walletId];
            const timeToWait = (tx.time * 60 * 1000) - (Date.now() - startTime);
            
            if (timeToWait > 0) {
                console.log(`Waiting ${timeToWait/1000} seconds for next transaction...`);
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }

            let tokenInfo;
            try {
                tokenInfo = this.tokenManager.loadTokenInfo(tx.token);
            } catch (error) {
                throw new Error(`Token ${tx.token} not found. Please initialize the token first.`);
            }

            console.log(`\nExecuting ${tx.action} transaction for ${tx.walletId}...`);
            await this.tradeMonitor.executeTokenTransaction(
                wallet,
                tokenInfo,
                tx.action,
                mintAuthorityWallet,
                tx.amount
            );
        }
    }
}

async function main() {
    const testCase = process.argv[2];
    if (!testCase || !['1', '2'].includes(testCase)) {
        console.error('Please specify a test case number (1 or 2)');
        console.log('Usage: node run-tests.js <test-case-number>');
        process.exit(1);
    }

    // Initialize trade monitor (without starting monitoring)
    const tradeMonitor = new TradeMonitor(
        Config.wallets,
        Config.copyWallet,
        Config.threshold,
        Config.timeWindow
    );

    const testRunner = new TestRunner(tradeMonitor);

    try {
        await testRunner.runTest(testCase);
        console.log('\nTest transactions completed successfully');
    } catch (error) {
        console.error('Error running test:', error);
        process.exit(1);
    }
}

// Run the tests
main().catch(console.error); 