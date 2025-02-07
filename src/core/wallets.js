const { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const { Config } = require('@src/core/config');


const WALLETS_DIR = Config.walletsDirectory;

async function loadWalletsFromDirectory() {
    let wallets = {};
    try {
        const walletFiles = fs.readdirSync(WALLETS_DIR);        
        console.log('Loading wallets...\n');
        
        for (const walletFile of walletFiles) {
            const walletId = walletFile.split('.')[0]; // Remove file extension
            const walletData = JSON.parse(
                fs.readFileSync(`${WALLETS_DIR}/${walletFile}`, 'utf8')
            );
            wallets[walletId] = walletData;
        }

    } catch (error) {
        console.error('Error checking wallets:', error);
    }
    return wallets;
}

async function checkBalancesForWallets(wallets) {
    try {
        console.log('Checking wallet balances...\n');
        
        for (const [walletId, walletData] of Object.entries(wallets)) {
            console.log(`\nChecking wallet: ${walletId}`);
            await checkBalanceForWallet(walletData.publicKey);
        }
    } catch (error) {
        console.error('Error checking wallets:', error);
    }
}



// Function to check a single wallet balance
async function checkBalanceForWallet(walletAddress) {
    try {
        const connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        const publicKey = new PublicKey(walletAddress);

        
        // Get SOL balance
        const balance = await connection.getBalance(publicKey);
        
        console.log(`\nWallet Address: ${walletAddress}`);
        console.log(`SOL Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        
        // Get all token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { programId: TOKEN_PROGRAM_ID }
        );
        
        if (tokenAccounts.value.length > 0) {
            console.log('\nToken Balances:');
            for (const tokenAccount of tokenAccounts.value) {
                const accountData = tokenAccount.account.data.parsed.info;
                console.log(`- Token: ${accountData.mint}`);
                console.log(`  Amount: ${accountData.tokenAmount.uiAmount}`);
            }
        } else {
            console.log('No token accounts found');
        }
        
    } catch (error) {
        console.error('Error checking balance:', error);
    }
}

async function requestAirdropForWallet(walletAddress, solAmount = 1) {
    try {
        const connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        const publicKey = new PublicKey(walletAddress);
        
        console.log(`Requesting airdrop of ${solAmount} SOL for wallet: ${walletAddress}`);
        
        const signature = await connection.requestAirdropForWallet(
            publicKey,
            solAmount * LAMPORTS_PER_SOL
        );
        
        await connection.confirmTransaction(signature);
        console.log('Airdrop successful!');
        
        // Check and display new balance
        const newBalance = await connection.getBalance(publicKey);
        console.log(`New balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
        
    } catch (error) {
        console.error('Error requesting airdrop:', error);
    }
}

async function requestAirdropForWallets(wallets, solAmount = 1) {
    try {
        console.log(`Requesting ${solAmount} SOL airdrop for all wallets...\n`);
        
        for (const [walletId, walletData] of Object.entries(wallets)) {
            console.log(`\nProcessing wallet: ${walletId}`);
            await requestAirdropForWallet(walletData.publicKey, solAmount);
        }
    } catch (error) {
        console.error('Error requesting airdrops:', error);
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
        
        fs.writeFileSync(`${WALLETS_DIR}/${walletId}.json`, JSON.stringify(walletData, null, 2));
        console.log(`Created wallet: ${walletId}`);
        return walletData;
    } catch (error) {
        console.error('Error creating wallet:', error);
        throw error;
    }
}

async function loadWalletByWalletId(walletId) {
    try {
        const walletPath = `${WALLETS_DIR}/${walletId}.json`;
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    } catch (error) {
        console.error(`Error loading wallet ${walletId}:`, error);
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