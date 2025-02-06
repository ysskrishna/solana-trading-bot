const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();

async function monitorWallet() {
    // Read wallet data
    const walletData = JSON.parse(fs.readFileSync('wallet.json', 'utf8'));
    const publicKey = new PublicKey(walletData.publicKey);
    
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log(`Starting to monitor wallet: ${publicKey.toString()}`);
    
    // Subscribe to account changes
    const subscriptionId = connection.onAccountChange(
        publicKey,
        (accountInfo, context) => {
            console.log('\nAccount changed!');
            console.log('New balance:', accountInfo.lamports / LAMPORTS_PER_SOL, 'SOL');
            console.log('Slot:', context.slot);
        },
        'confirmed'
    );

    // Monitor transactions
    connection.onLogs(
        publicKey,
        (logs, ctx) => {
            console.log('\nNew transaction detected!');
            console.log('Signature:', ctx.signature);
            console.log('Logs:', logs.logs);
        },
        'confirmed'
    );

    // Keep the script running
    process.on('SIGINT', () => {
        console.log('Stopping monitoring...');
        connection.removeAccountChangeListener(subscriptionId);
        process.exit();
    });
}

monitorWallet().catch(console.error); 