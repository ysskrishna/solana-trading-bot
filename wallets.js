const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
require('dotenv').config();


async function loadAllWallets() {
    let wallets = {};
    try {
        // Read all wallet files from the wallets directory
        const walletFiles = fs.readdirSync('./wallets');

        
        console.log('Loading wallets...\n');
        
        for (const walletFile of walletFiles) {
            const walletId = walletFile.split('.')[0]; // Remove file extension
            const walletData = JSON.parse(
                fs.readFileSync(`./wallets/${walletFile}`, 'utf8')
            );
            wallets[walletId] = walletData;
        }

    } catch (error) {
        console.error('Error checking wallets:', error);
    }
    return wallets;
}

async function checkWalletBalances(wallets) {
    try {
        console.log('Checking wallet balances...\n');
        
        for (const [walletId, walletData] of Object.entries(wallets)) {
            console.log(`\nChecking wallet: ${walletId}`);
            await checkSingleWalletBalance(walletData.publicKey);
        }
    } catch (error) {
        console.error('Error checking wallets:', error);
    }
}



// Function to check a single wallet balance
async function checkSingleWalletBalance(walletAddress) {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
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

module.exports = { 
    loadAllWallets, 
    checkWalletBalances, 
    checkSingleWalletBalance 
};