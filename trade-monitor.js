const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

class TradeMonitor {
    constructor(wallets, copyWallet, threshold, timeWindow) {
        this.wallets = wallets;
        this.copyWallet = copyWallet;
        this.threshold = threshold;
        this.timeWindow = timeWindow * 60 * 1000; // Convert minutes to milliseconds
        this.transactions = [];
        this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        this.subscriptions = new Map();
        this.monitoredAddresses = new Set();
    }

    // Utility function to get public key from wallet
    getPublicKey(wallet) {
        return wallet.publicKey;
    }

    // Start monitoring wallets in real-time
    async startMonitoring() {
        console.log('\nStarting real-time wallet monitoring...');
        
        // Setup monitoring for each wallet
        for (const [walletId, wallet] of Object.entries(this.wallets)) {
            if (this.getPublicKey(wallet) !== this.getPublicKey(this.copyWallet)) {
                await this.monitorWallet(wallet, walletId);
            }
        }
    }

    // Monitor a single wallet
    async monitorWallet(wallet, walletId) {
        const publicKeyStr = this.getPublicKey(wallet);
        if (this.monitoredAddresses.has(publicKeyStr)) {
            return; // Already monitoring this wallet
        }

        console.log(`Setting up monitoring for wallet ${walletId} (${publicKeyStr})`);
        
        try {
            const publicKey = new PublicKey(publicKeyStr);
            
            // Subscribe to account changes
            const subscriptionId = this.connection.onAccountChange(
                publicKey,
                async (accountInfo, context) => {
                    await this.handleAccountChange(wallet, walletId, accountInfo, context);
                },
                'confirmed'
            );

            // Monitor program logs for token transactions
            const logSubscriptionId = this.connection.onLogs(
                publicKey,
                async (logs, ctx) => {
                    await this.handleTransactionLogs(wallet, walletId, logs, ctx);
                },
                'confirmed'
            );

            this.subscriptions.set(publicKeyStr, [subscriptionId, logSubscriptionId]);
            this.monitoredAddresses.add(publicKeyStr);
            
        } catch (error) {
            console.error(`Error setting up monitoring for wallet ${walletId}:`, error);
        }
    }

    // Handle account changes
    async handleAccountChange(wallet, walletId, accountInfo, context) {
        console.log(`\nAccount change detected for wallet ${walletId} (${this.getPublicKey(wallet)})`);
        console.log(`New balance: ${accountInfo.lamports / LAMPORTS_PER_SOL} SOL`);
    }

    // Handle transaction logs
    async handleTransactionLogs(wallet, walletId, logs, ctx) {
        try {
            const logStr = logs.logs.join('\n');
            
            if (logStr.includes('Transfer') || logStr.includes('transfer')) {
                let action = 'buy';
                if (logStr.includes('out')) action = 'sell';
                console.log(`Wallet ${walletId} (${this.getPublicKey(wallet)}) Action: ${action}`);

                const tokenMatch = logStr.match(/token:?\s*([A-Za-z0-9]{32,})/i);
                const token = tokenMatch ? tokenMatch[1] : 'unknown';

                console.log("Identified Token: ", token);

                const amountMatch = logStr.match(/amount:?\s*([\d.]+)/i);
                const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

                await this.recordTransaction(wallet, walletId, token, action, amount);
            }
        } catch (error) {
            console.error('Error processing transaction logs:', error);
        }
    }

    // Record a transaction and check for copy trade opportunity
    async recordTransaction(wallet, walletId, token, action, amount) {
        const transaction = {
            wallet,
            walletId,
            token,
            action,
            amount,
            timestamp: Date.now()
        };
        
        this.transactions.push(transaction);
        console.log(`\nTransaction recorded: Wallet ${walletId} (${this.getPublicKey(wallet)}) ${action} ${token} for ${amount} SOL`);
        
        await this.checkForCopyTrade(token, action);
    }

    // Check if we should execute a copy trade
    async checkForCopyTrade(token, action) {
        const now = Date.now();
        const windowStart = now - this.timeWindow;
        
        // Get all transactions for this token and action within the time window
        const relevantTransactions = this.transactions.filter(tx => 
            tx.token === token &&
            tx.action === action &&
            tx.timestamp >= windowStart
        );

        // Count unique wallets that performed this action
        const uniqueWallets = new Set(relevantTransactions.map(tx => tx.walletId));

        if (uniqueWallets.size >= this.threshold) {
            console.log(`\nQualifying Activity Detected!`);
            console.log(`${action} ${token}`);
            console.log(`${uniqueWallets.size} wallets performed this action within the time window`);
            
            // Execute copy trade
            await this.executeCopyTrade(token, action);
        }
    }

    // Execute a copy trade
    async executeCopyTrade(token, action) {
        const FIXED_TRADE_AMOUNT = 0.05; // SOL
        
        console.log(`\nExecuting copy trade:`);
        console.log(`Wallet: ${this.copyWallet}`);
        console.log(`Action: ${action}`);
        console.log(`Token: ${token}`);
        console.log(`Amount: ${FIXED_TRADE_AMOUNT} SOL`);
        
        try {
            // Here you would implement the actual trade execution
            // For example, using a DEX like Serum or Raydium
            // This would involve:
            // 1. Creating the appropriate transaction
            // 2. Signing it with the copy wallet's keypair
            // 3. Sending and confirming the transaction
            
            console.log('Trade executed successfully');
        } catch (error) {
            console.error('Error executing trade:', error);
        }
    }

    // Stop monitoring
    async stopMonitoring() {
        console.log('\nStopping wallet monitoring...');
        
        // Remove all subscriptions
        for (const [walletAddress, [subscriptionId, logSubscriptionId]] of this.subscriptions) {
            try {
                await this.connection.removeAccountChangeListener(subscriptionId);
                await this.connection.removeOnLogsListener(logSubscriptionId);
                console.log(`Stopped monitoring wallet: ${walletAddress}`);
            } catch (error) {
                console.error(`Error removing subscription for wallet ${walletAddress}:`, error);
            }
        }
        
        this.subscriptions.clear();
        this.monitoredAddresses.clear();
    }

    // Run test cases in real-time simulation
    async runTestCases() {
        // Start real-time monitoring
        await this.startMonitoring();
        
        console.log('\nRunning Test Case 1 in real-time simulation:');
        const wallet1 = Object.values(this.wallets)[0];
        const wallet2 = Object.values(this.wallets)[1];
        
        // Test Case 1 - Now these will trigger real-time monitoring
        await this.recordTransaction(wallet1, 'wallet1', 'xyz', 'buy', 0.4);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate time passing
        
        await this.recordTransaction(wallet1, 'wallet1', 'xyz', 'buy', 0.2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.recordTransaction(wallet1, 'wallet1', 'xyz', 'sell', 0.5);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.recordTransaction(wallet1, 'wallet1', 'abc', 'buy', 0.2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.recordTransaction(wallet2, 'wallet2', 'xyz', 'buy', 0.05);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.recordTransaction(wallet2, 'wallet2', 'abc', 'buy', 0.15);
        
        console.log('\nRunning Test Case 2:');
        this.transactions = [];
        
        await this.recordTransaction(wallet1, 'wallet1', 'xyz', 'buy', 0.4);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.recordTransaction(wallet2, 'wallet2', 'xyz', 'buy', 0.2);
        
        // Keep monitoring for a while to see the results
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Stop monitoring
        await this.stopMonitoring();
    }
}

module.exports = { TradeMonitor }; 