const { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const { Config } = require('@src/core/config');
const logger = require('@src/core/logger');

const WALLETS_DIR = Config.walletsDirectory;

async function loadWalletsFromDirectory() {
    let wallets = {};
    try {
        const walletFiles = fs.readdirSync(WALLETS_DIR);        
        logger.info('Loading wallets...');
        
        for (const walletFile of walletFiles) {
            const walletId = walletFile.split('.')[0]; // Remove file extension
            const walletData = JSON.parse(
                fs.readFileSync(path.join(WALLETS_DIR, walletFile), 'utf8')
            );
            wallets[walletId] = walletData;
        }

    } catch (error) {
        logger.error(`Error checking wallets: ${error.message}`);
    }
    return wallets;
}

async function checkBalancesForWallets(wallets) {
    try {
        logger.info('Checking wallet balances...');
        
        for (const [walletId, walletData] of Object.entries(wallets)) {
            logger.info(`Checking wallet: ${walletId}`);
            await checkBalanceForWallet(walletData.publicKey);
        }
    } catch (error) {
        logger.error('Error checking wallets:', { error: error.message });
    }
}

// Function to check a single wallet balance
async function checkBalanceForWallet(walletAddress) {
    try {
        const connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        const publicKey = new PublicKey(walletAddress);

        
        // Get SOL balance
        const balance = await connection.getBalance(publicKey);
        
        logger.info(`Wallet balance details - Address: ${walletAddress}, Balance: ${balance}`);
        
        // Get all token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { programId: TOKEN_PROGRAM_ID }
        );
        
        if (tokenAccounts.value.length > 0) {
            for (const tokenAccount of tokenAccounts.value) {
                const accountData = tokenAccount.account.data.parsed.info;
                const tokenBalance = accountData.tokenAmount.uiAmount;
                logger.info(`Token balance for ${walletAddress}: ${tokenBalance}`);
            }
        } else {
            logger.info(`No token accounts found for wallet: ${walletAddress}`);
        }
        
    } catch (error) {
        logger.error(`Error checking balance: ${error.message}`);
    }
}

async function requestAirdropForWallet(walletAddress, solAmount = 1) {
    try {
        const connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        const publicKey = new PublicKey(walletAddress);
        
        logger.info(`Requesting airdrop of ${solAmount} SOL to ${walletAddress}`);
        
        const signature = await connection.requestAirdropForWallet(
            publicKey,
            solAmount * LAMPORTS_PER_SOL
        );
        
        await connection.confirmTransaction(signature);
        logger.info(`Airdrop successful to wallet: ${walletAddress}`);
        
        // Check and display new balance
        const newBalance = await connection.getBalance(publicKey);
        logger.info(`New balance after airdrop: ${newBalance}`);
        
    } catch (error) {
        logger.error(`Error requesting airdrop: ${error.message}`);
    }
}

async function requestAirdropForWallets(wallets, solAmount = 1) {
    try {
        logger.info(`Requesting airdrop for all wallets: ${solAmount} SOL`);
        
        for (const [walletId, walletData] of Object.entries(wallets)) {
            logger.info(`Processing wallet for airdrop: ${walletId}`);
            await requestAirdropForWallet(walletData.publicKey, solAmount);
        }
    } catch (error) {
        logger.error(`Error requesting airdrops: ${error.message}`);
    }
}

async function createWallet(walletId) {
    try {
        const keypair = Keypair.generate();
        const walletData = {
            publicKey: keypair.publicKey.toString(),
            secretKey: Array.from(keypair.secretKey)
        };
        
        // Ensure the wallets directory exists
        if (!fs.existsSync(WALLETS_DIR)) {
            fs.mkdirSync(WALLETS_DIR, { recursive: true });
        }
        
        fs.writeFileSync(path.join(WALLETS_DIR, `${walletId}.json`), JSON.stringify(walletData, null, 2));
        logger.info(`Wallet created successfully - ID: ${walletId}, Address: ${keypair.publicKey.toString()}`);
        return walletData;
    } catch (error) {
        logger.error(`Error creating wallet: ${error.message}`);
        throw error;
    }
}

async function loadWalletByWalletId(walletId) {
    try {
        const walletPath = path.join(WALLETS_DIR, `${walletId}.json`);
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        logger.info(`Wallet loaded successfully: ${walletId}`);
        return walletData;
    } catch (error) {
        logger.error(`Error loading wallet: ${error.message}`);
        throw error;
    }
}

module.exports = { 
    loadWalletsFromDirectory, 
    loadWalletByWalletId,
    checkBalancesForWallets, 
    checkBalanceForWallet,
    requestAirdropForWallet,
    requestAirdropForWallets,
    createWallet
};