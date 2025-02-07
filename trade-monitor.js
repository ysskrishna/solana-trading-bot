const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const { TokenManager } = require('./token-manager');
const { Config } = require('./config');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

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
        this.ataSubscriptions = new Map(); // Store ATA subscriptions
    }

    // Get keypair from wallet data
    getKeypair(wallet) {
        return Keypair.fromSecretKey(new Uint8Array(wallet.secretKey));
    }

    // Get public key from wallet
    getPublicKey(wallet) {
        return wallet.publicKey;
    }

    // Fetch all ATAs for a wallet
    async fetchATAs(wallet) {
        try {
            const walletPubkey = new PublicKey(this.getPublicKey(wallet));
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
                programId: TOKEN_PROGRAM_ID
            });

            console.log("tokenAccounts length: ", tokenAccounts.value.length);
            let atas = [];
            if (tokenAccounts.value.length > 0) {
                for (const tokenAccount of tokenAccounts.value) {
                    const accountData = tokenAccount.account.data.parsed.info;
                    atas.push({
                        pubkey: tokenAccount.pubkey.toString(),
                        mint: accountData.mint,
                        amount: accountData?.tokenAmount?.amount
                    });
                }
            }
            
            console.log(`Fetched ${atas.length} ATAs for wallet ${this.getPublicKey(wallet)}`);
            return atas;
        } catch (error) {
            console.error('Error fetching ATAs:', error);
            return [];
        }
    }

    // Monitor an ATA for changes
    async monitorATA(ata, wallet, walletId) {
        try {
            const ataPubkey = new PublicKey(ata.pubkey);
            
            // Subscribe to ATA balance changes
            const subscriptionId = this.connection.onAccountChange(
                ataPubkey,
                async (accountInfo) => {
                    await this.handleATAChange(ata, wallet, walletId, accountInfo);
                },
                'confirmed'
            );
            
            this.ataSubscriptions.set(ata.pubkey, subscriptionId);
            console.log(`Monitoring ATA: ${ata.pubkey} for wallet ${walletId}`);
        } catch (error) {
            console.error(`Error setting up ATA monitoring for ${ata.pubkey}:`, error);
        }
    }

    // Handle ATA balance changes
    async handleATAChange(ata, wallet, walletId, accountInfo) {
        try {
            // console.log("ATA balance changed for wallet: ", walletId, "ATA: ", ata, "accountInfo: ", accountInfo);
            
            // Parse the account data
            const parsedData = await this.connection.getParsedAccountInfo(new PublicKey(ata.pubkey));
            if (!parsedData.value?.data?.parsed?.info) {
                console.error('Unable to parse account data');
                return;
            }

            const tokenData = parsedData.value.data.parsed.info;
            const newAmount = BigInt(tokenData.tokenAmount.amount);
            const oldAmount = BigInt(ata.amount || '0');
            
            if (newAmount !== oldAmount) {
                const action = newAmount > oldAmount ? 'buy' : 'sell';
                const amountDiff = newAmount > oldAmount ? 
                    newAmount - oldAmount : 
                    oldAmount - newAmount;
                
                // Convert to decimal amount using token decimals
                const decimals = tokenData.tokenAmount.decimals;
                const decimalAmount = Number(amountDiff) / Math.pow(10, decimals);
                
                await this.recordTransaction(wallet, walletId, ata.mint, action, decimalAmount);
                ata.amount = tokenData.tokenAmount.amount; // Store as string
            }
        } catch (error) {
            console.error('Error handling ATA change:', error);
        }
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
            
            // Fetch and monitor existing ATAs
            const atas = await this.fetchATAs(wallet);
            console.log(`Fetched ${walletId} atas length: ${atas.length}`);
            for (const ata of atas) {
                console.log(`Monitoring ATA: ${ata.pubkey} for wallet ${walletId}`);
                await this.monitorATA(ata, wallet, walletId);
            }
            
            // Monitor wallet for new ATA creation
            const logSubscriptionId = this.connection.onLogs(
                publicKey,
                async (logs, ctx) => {
                    await this.handleTransactionLogs(wallet, walletId, logs, ctx);
                },
                'confirmed'
            );

            this.subscriptions.set(publicKeyStr, logSubscriptionId);
            this.monitoredAddresses.add(publicKeyStr);
            
        } catch (error) {
            console.error(`Error setting up monitoring for wallet ${walletId}:`, error);
        }
    }

    // Handle transaction logs
    async handleTransactionLogs(wallet, walletId, logs, ctx) {
        try {
            const logStr = logs.logs.join('\n');
            
            // Check for ATA creation
            if (logStr.includes('Create associated token account')) {
                console.log(`New ATA detected for wallet ${walletId}`);
                // Refresh ATAs and set up monitoring for new ones
                const atas = await this.fetchATAs(wallet);
                for (const ata of atas) {
                    if (!this.ataSubscriptions.has(ata.pubkey)) {
                        await this.monitorATA(ata, wallet, walletId);
                    }
                }
            }
            
            // Continue monitoring other token operations
            if (logStr.includes('Instruction: MintToChecked')) {
                const tokenMatch = logStr.match(/token:?\s*([A-Za-z0-9]{32,})/i);
                const token = tokenMatch ? tokenMatch[1] : Config.tokenName;
                const amountMatch = logStr.match(/amount:?\s*([\d.]+)/i);
                const decimalsMatch = logStr.match(/decimals:?\s*(\d+)/i);
                
                if (amountMatch && decimalsMatch) {
                    const rawAmount = parseFloat(amountMatch[1]);
                    const decimals = parseInt(decimalsMatch[1]);
                    const amount = rawAmount / Math.pow(10, decimals);
                    await this.recordTransaction(wallet, walletId, token, 'buy', amount);
                }
            } else if (logStr.includes('Instruction: BurnChecked')) {
                const tokenMatch = logStr.match(/token:?\s*([A-Za-z0-9]{32,})/i);
                const token = tokenMatch ? tokenMatch[1] : Config.tokenName;
                const amountMatch = logStr.match(/amount:?\s*([\d.]+)/i);
                const decimalsMatch = logStr.match(/decimals:?\s*(\d+)/i);
                
                if (amountMatch && decimalsMatch) {
                    const rawAmount = parseFloat(amountMatch[1]);
                    const decimals = parseInt(decimalsMatch[1]);
                    const amount = rawAmount / Math.pow(10, decimals);
                    await this.recordTransaction(wallet, walletId, token, 'sell', amount);
                }
            }
        } catch (error) {
            console.error('Error processing transaction logs:', error);
        }
    }

    // Record a transaction and check for copy trade opportunity
    async recordTransaction(wallet, walletId, token, action, amount) {
        console.log("recordTransaction walletId: ", walletId, ", Token: ", token, ", Action: ", action, ", Amount: ", amount);
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
            // Load token info first
            const tokenInfo = this.tokenManager.loadTokenInfo(Config.tokenName);
            const mintAuthorityWallet = this.wallets["wallet1"]; // Get mint authority wallet

            const success = await this.executeTokenTransaction(
                this.copyWallet,
                tokenInfo,
                action,
                mintAuthorityWallet,
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
        
        // Remove wallet subscriptions
        for (const [walletAddress, subscriptionId] of this.subscriptions) {
            try {
                await this.connection.removeOnLogsListener(subscriptionId);
                console.log(`Stopped monitoring wallet: ${walletAddress}`);
            } catch (error) {
                console.error(`Error removing subscription for wallet ${walletAddress}:`, error);
            }
        }
        
        // Remove ATA subscriptions
        for (const [ataAddress, subscriptionId] of this.ataSubscriptions) {
            try {
                await this.connection.removeAccountChangeListener(subscriptionId);
                console.log(`Stopped monitoring ATA: ${ataAddress}`);
            } catch (error) {
                console.error(`Error removing subscription for ATA ${ataAddress}:`, error);
            }
        }
        
        this.subscriptions.clear();
        this.ataSubscriptions.clear();
        this.monitoredAddresses.clear();
    }
}

module.exports = { TradeMonitor }; 