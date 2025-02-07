const { TokenManager } = require('./token-manager');
const { Config } = require('./config');
const { loadWalletByWalletId } = require("./wallets");

class TestRunner {
    constructor() {
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
            case '3':
                // simplified test case of case 1, with smaller amounts
                return [
                    { time: 2, walletId: 'wallet1', action: 'buy', amount: 0.004, token: Config.tokenName },
                    { time: 6, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.tokenName },
                    { time: 10, walletId: 'wallet1', action: 'sell', amount: 0.005, token: Config.tokenName },
                    { time: 12, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.tokenName },
                    { time: 18, walletId: 'wallet2', action: 'buy', amount: 0.0005, token: Config.tokenName },
                    { time: 22, walletId: 'wallet2', action: 'buy', amount: 0.0015, token: Config.tokenName }
                ];
            case '4':
                // simplified test case of case 2, with smaller amounts
                return [
                    { time: 2, walletId: 'wallet1', action: 'buy', amount: 0.002, token: Config.tokenName },
                    { time: 6, walletId: 'wallet2', action: 'buy', amount: 0.001, token: Config.tokenName }
                ];
            default:
                throw new Error('Invalid test case number');
        }

    }

    async executeTestTransactions(transactions) {
        const mintAuthorityWallet = await loadWalletByWalletId("wallet1");
        let startTime = Date.now();



        for (const tx of transactions) {
            const wallet = await loadWalletByWalletId(tx.walletId);
            const timeToWait = (tx.time * 60 * 1000) - (Date.now() - startTime);
            

            if (timeToWait > 0) {
                console.log(`Waiting ${timeToWait/1000} seconds for next transaction...`);
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }

            console.log(`\nExecuting ${tx.action} transaction for ${tx.walletId}...`);
            await this.tokenManager.executeTokenTransaction(
                wallet,
                tx.token,
                tx.action,
                mintAuthorityWallet,
                tx.amount
            );            
            console.log(`Successfully executed ${tx.action} transaction for ${tx.walletId}`);
        }
    }
}

async function main() {
    const testCase = process.argv[2];
    if (!testCase || !['1', '2', '3', '4'].includes(testCase)) {
        console.error('Please specify a test case number (1 or 2)');
        console.log('Usage: node run-tests.js <test-case-number>');
        process.exit(1);
    }

    const testRunner = new TestRunner();

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