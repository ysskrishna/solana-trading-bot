const { loadAllWallets, requestAirdrop, checkSingleWalletBalance, createWallet } = require('./wallets');
const { TokenManager } = require('./token-manager');

async function initialize() {
    // Create and setup wallets
    await createWallet("wallet1");
    await createWallet("wallet2");
    await createWallet("wallet3");

    let wallets = await loadAllWallets();

    // // Request airdrops for initial wallets
    let wallet1 = wallets["wallet1"];
    await requestAirdrop(wallet1.publicKey, 1);
    await checkSingleWalletBalance(wallet1.publicKey);

    let wallet2 = wallets["wallet2"];
    await requestAirdrop(wallet2.publicKey, 1);
    await checkSingleWalletBalance(wallet2.publicKey);

    // Initialize token manager
    const tokenManager = new TokenManager();


    // Create a test token
    try {
        const testToken = await tokenManager.createToken(wallet1, "XyzToken");
        console.log("Test token created successfully");
    } catch (error) {
        console.error("Error creating test token:", error);
    }
}

initialize().catch(console.error);