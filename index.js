const fs = require('fs');
require('dotenv').config();

let wallets = {};

async function loadAllWallets() {
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
}

loadAllWallets();

console.log(wallets);