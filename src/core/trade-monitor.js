const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { TokenManager } = require('@src/core/token-manager');
const { Config } = require('@src/core/config');
const logger = require('@src/core/logger');

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

            logger.info(`Found ${tokenAccounts.value.length} ATAs for wallet ${this.getPublicKey(wallet)}`);
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
            
            logger.info(`Fetched ${atas.length} ATAs for wallet ${this.getPublicKey(wallet)}`);
            return atas;
        } catch (error) {
            logger.error(`Error fetching ATAs: ${error}`);
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
            logger.info(`Monitoring ATA: ${ata.pubkey} for wallet ${walletId}`);
        } catch (error) {
            logger.error(`Error setting up ATA monitoring for ${ata.pubkey}: ${error}`);
        }
    }

    // Handle ATA balance changes
    async handleATAChange(ata, wallet, walletId, accountInfo) {
        try {
            // Parse the account data
            const parsedData = await this.connection.getParsedAccountInfo(new PublicKey(ata.pubkey));
            if (!parsedData.value?.data?.parsed?.info) {
                logger.error('Unable to parse account data');
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
            logger.error(`Error handling ATA change: ${error}`);
        }
    }

    // Start monitoring wallets in real-time
    async startMonitoring() {
        logger.info('Starting real-time wallet monitoring...');
        
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

        logger.info(`Setting up monitoring for wallet ${walletId} (${publicKeyStr})`);
        
        try {
            const publicKey = new PublicKey(publicKeyStr);
            
            // Fetch and monitor existing ATAs
            const atas = await this.fetchATAs(wallet);
            logger.info(`Fetched ${walletId} atas length: ${atas.length}`);
            for (const ata of atas) {
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
            logger.error(`Error setting up monitoring for wallet ${walletId}: ${error}`);
        }
    }

    // Handle transaction logs
    async handleTransactionLogs(wallet, walletId, logs, ctx) {
        try {
            const logStr = logs.logs.join('\n');
            
            // Check for ATA creation
            if (logStr.includes('Create associated token account')) {
                logger.info(`New ATA detected for wallet ${walletId}`);
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
            logger.error(`Error processing transaction logs: ${error}`);
        }
    }

    // Record a transaction and check for copy trade opportunity
    async recordTransaction(wallet, walletId, token, action, amount) {
        logger.info(`recordTransaction walletId: ${walletId}, Token: ${token}, Action: ${action}, Amount: ${amount}`);
        const transaction = {
            wallet,
            walletId,
            token,
            action,
            amount,
            timestamp: Date.now()
        };
        
        this.transactions.push(transaction);
        logger.info(`Transaction recorded: Wallet ${walletId} (${this.getPublicKey(wallet)}) ${action} ${token} for ${amount} SOL`);
        
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
            logger.info('Qualifying Activity Detected!');
            logger.info(`${action} ${token}`);
            logger.info(`${uniqueWallets.size} wallets performed this action within the time window`);
            
            // Execute copy trade
            await this.executeCopyTrade(token, action);
        }
    }

    // Execute a copy trade
    async executeCopyTrade(token, action) {
        const FIXED_TRADE_AMOUNT = 0.001; // Fixed amount in SOL for copy trades
        
        logger.info('Executing copy trade:');
        logger.info(`Wallet: ${this.getPublicKey(this.copyWallet)}`);
        logger.info(`Action: ${action}`);
        logger.info(`Token: ${token}`);
        logger.info(`Amount: ${FIXED_TRADE_AMOUNT} SOL`);

        try {
            const mintAuthorityWallet = this.wallets["wallet1"]; // Get mint authority wallet
            await this.tokenManager.executeTokenTransaction(
                this.copyWallet,
                Config.tokenName, // TODO: fix to use tokename obtained from token above
                action,
                mintAuthorityWallet,
                FIXED_TRADE_AMOUNT
            );
            
            logger.info('Copy trade executed successfully');
        } catch (error) {
            logger.error(`Error executing copy trade: ${error}`);
        }
    }

    // Stop monitoring all wallets
    async stopMonitoring() {
        logger.info('Stopping wallet monitoring...');
        
        // Remove wallet subscriptions
        for (const [walletAddress, subscriptionId] of this.subscriptions.entries()) {
            try {
                await this.connection.removeAccountChangeListener(subscriptionId);
                logger.info(`Stopped monitoring wallet: ${walletAddress}`);
            } catch (error) {
                logger.error(`Error removing subscription for wallet ${walletAddress}: ${error}`);
            }
        }
        
        // Remove ATA subscriptions
        for (const [ataAddress, subscriptionId] of this.ataSubscriptions.entries()) {
            try {
                await this.connection.removeAccountChangeListener(subscriptionId);
                logger.info(`Stopped monitoring ATA: ${ataAddress}`);
            } catch (error) {
                logger.error(`Error removing subscription for ATA ${ataAddress}: ${error}`);
            }
        }
        
        this.subscriptions.clear();
        this.ataSubscriptions.clear();
        this.monitoredAddresses.clear();
    }
}

module.exports = { TradeMonitor }; 