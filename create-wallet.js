const { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();

async function createTestWallet() {
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Generate a new keypair
    const wallet = Keypair.generate();
    
    // Save wallet details
    const walletData = {
        publicKey: wallet.publicKey.toString(),
        secretKey: Array.from(wallet.secretKey)
    };
    
    // Save to file
    fs.writeFileSync('wallet.json', JSON.stringify(walletData, null, 2));
    
    console.log('Wallet created successfully!');
    console.log('Public Key:', wallet.publicKey.toString());
    
    // Request airdrop
    try {
        const signature = await connection.requestAirdrop(
            wallet.publicKey,
            LAMPORTS_PER_SOL // 1 SOL
        );
        await connection.confirmTransaction(signature);
        console.log('Airdrop of 1 SOL successful!');
    } catch (error) {
        console.error('Error requesting airdrop:', error);
    }
}

createTestWallet().catch(console.error); 