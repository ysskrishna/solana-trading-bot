const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const { TokenManager } = require('./token-manager');
const { Config } = require('./config');

class TradeMonitor {
    constructor(wallets, copyWallet, threshold, timeWindow) {
        this.wallets = wallets;
        this.copyWallet = copyWallet;
        this.threshold = threshold;
        this.timeWindow = timeWindow * 60 * 1000; // Convert minutes to milliseconds
        this.transactions = [];
        this.connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        this.subscriptions = new Map();
        this.monitoredAddresses = new Set();
        this.tokenAccounts = new Map(); // Store token accounts for each wallet
        this.tokenManager = new TokenManager();
    }

    // Get keypair from wallet data
    getKeypair(wallet) {
        return Keypair.fromSecretKey(new Uint8Array(wallet.secretKey));
    }

    // Get public key from wallet
    getPublicKey(wallet) {
        return wallet.publicKey;
    }

    // Execute a real token transaction
    async executeTokenTransaction(wallet, tokenInfo, action, mintAuthorityWallet, amount) {
        try {
            if (action === 'buy') {
                console.log("Minting tokens");
                this.tokenManager.mintTokens(tokenInfo, wallet, mintAuthorityWallet, amount);

            } else if (action === 'sell') {
                console.log("Burning tokens");
                this.tokenManager.burnTokens(tokenInfo, wallet, mintAuthorityWallet, amount);
            }
            return true;
        } catch (error) {
            console.error('Error executing token transaction:', error);
            return false;
        }
    }

    // Run test cases with real token transactions
    async runTestCases() {
        await this.startMonitoring();
        
        const walletKeys = Object.keys(this.wallets);
        const walletIdA = walletKeys[0];
        const walletIdB = walletKeys[1];
        const walletA = this.wallets[walletIdA];
        const walletB = this.wallets[walletIdB];
        const TOKEN_NAME = Config.tokenName;
        const mintAuthorityWallet = this.wallets["wallet1"];


        
        let tokenInfo;
        try {
            tokenInfo = this.tokenManager.loadTokenInfo(TOKEN_NAME);
        } catch (error) {
            throw new Error(`Token ${TOKEN_NAME} not found. Please initialize the token first.`);
        }



        console.log('\nRunning Test Case 2 with real token transactions:');
        this.transactions = [];

        // Execute real token transactions with smaller amounts
        console.log('\nExecuting first buy transaction...');
        await this.executeTokenTransaction(walletA, tokenInfo, 'buy', mintAuthorityWallet, 0.002);

        console.log('\nExecuting second buy transaction...');
        await this.executeTokenTransaction(walletB, tokenInfo, 'buy', mintAuthorityWallet, 0.001);


        // Keep monitoring for a while to see the results
        console.log('\nWaiting for copy trade execution...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Stop monitoring
        await this.stopMonitoring();
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
            console.log("walletId: ", walletId, "Log string: ", logStr);
            
            // Check for mint or burn operations
            if (logStr.includes('Instruction: MintToChecked')) {
                const action = 'buy';  // MintToChecked indicates a buy action
                console.log(`Wallet ${walletId} (${this.getPublicKey(wallet)}) Action: ${action}`);

                // Extract token information
                const tokenMatch = logStr.match(/token:?\s*([A-Za-z0-9]{32,})/i);
                const token = tokenMatch ? tokenMatch[1] : Config.tokenName; // Default to configured token if not found

                // Extract amount if available
                const amountMatch = logStr.match(/amount:?\s*([\d.]+)/i);
                const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

                await this.recordTransaction(wallet, walletId, token, action, amount);
            } else if (logStr.includes('Instruction: BurnChecked')) {
                const action = 'sell';  // BurnChecked indicates a sell action
                console.log(`Wallet ${walletId} (${this.getPublicKey(wallet)}) Action: ${action}`);

                const tokenMatch = logStr.match(/token:?\s*([A-Za-z0-9]{32,})/i);
                const token = tokenMatch ? tokenMatch[1] : Config.tokenName;

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
        console.log("recordTransaction walletId: ", walletId, "Token: ", token, "Action: ", action, "Amount: ", amount);
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

    // Execute a real copy trade
    async executeCopyTrade(token, action) {
        const FIXED_TRADE_AMOUNT = 0.001; // TODO: Reduced from 0.05 SOL to 0.001 SOL. convert back
        
        console.log(`\nExecuting copy trade:`);
        console.log(`Wallet: ${this.getPublicKey(this.copyWallet)}`);
        console.log(`Action: ${action}`);
        console.log(`Token: ${token}`);
        console.log(`Amount: ${FIXED_TRADE_AMOUNT} SOL`);
        
        try {
            const success = await this.executeTokenTransaction(
                this.copyWallet,
                token,
                action,
                FIXED_TRADE_AMOUNT
            );

            if (success) {
                console.log('Copy trade executed successfully');
            } else {
                console.log('Copy trade failed');
            }
        } catch (error) {
            console.error('Error executing copy trade:', error);
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
}

module.exports = { TradeMonitor }; 