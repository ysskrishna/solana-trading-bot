const { loadAllWallets, checkWalletBalances, requestAirdrop, checkSingleWalletBalance, createWallet } = require('./wallets');

async function main() {
    let wallets = await loadAllWallets();
    console.log("Wallets loaded:", wallets);
    
    await checkWalletBalances(wallets);

    // let wallet = wallets["wallet2"];
    // await requestAirdrop(wallet.publicKey, 1);
    // await checkSingleWalletBalance(wallet.publicKey);

    // await createWallet("wallet4");


}

main().catch(console.error);