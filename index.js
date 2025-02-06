const { loadAllWallets, checkWalletBalances, requestAirdropAll , requestAirdrop, checkSingleWalletBalance } = require('./wallets');

async function main() {
    let wallets = await loadAllWallets();
    console.log("Wallets loaded:", wallets);
    
    await checkWalletBalances(wallets);

    // let wallet = wallets["wallet2"];
    // await requestAirdrop(wallet.publicKey, 1);

}

main().catch(console.error);