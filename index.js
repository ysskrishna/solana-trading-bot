const { loadAllWallets, checkWalletBalances } = require('./wallets');

async function main() {
    let wallets = await loadAllWallets();
    // console.log("Wallets loaded:", wallets);    
    await checkWalletBalances(wallets);


}

main().catch(console.error);