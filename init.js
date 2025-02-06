const { loadAllWallets, requestAirdrop, checkSingleWalletBalance, createWallet } = require('./wallets');

async function initialize() {
    await createWallet("wallet1");
    await createWallet("wallet2");
    await createWallet("wallet3");

    let wallets = await loadAllWallets();

    let wallet1 = wallets["wallet1"];
    await requestAirdrop(wallet1.publicKey, 1);
    await checkSingleWalletBalance(wallet1.publicKey);

    let wallet2 = wallets["wallet2"];
    await requestAirdrop(wallet2.publicKey, 1);
    await checkSingleWalletBalance(wallet2.publicKey);

}

initialize().catch(console.error);