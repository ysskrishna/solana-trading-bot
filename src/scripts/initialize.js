require('module-alias/register');

const { loadWalletsFromDirectory, requestAirdropForWallet, checkBalanceForWallet, checkBalancesForWallets, createWallet } = require('@src/core/wallets');
const { TokenManager } = require('@src/core/token-manager');
const { Config } = require('@src/core/config');


async function initialize() {
    // Create and setup wallets for monitoring
    await createWallet("wallet1");
    await createWallet("wallet2");
    await createWallet("wallet3");

    // Create a copier wallet - which executes the copy trades trades
    await createWallet("copier");

    let wallets = await loadWalletsFromDirectory();
    await checkBalancesForWallets(wallets);

    // Request airdrops for initial wallets
    let wallet1 = wallets["wallet1"];
    await requestAirdropForWallet(wallet1.publicKey, 1);
    await checkBalanceForWallet(wallet1.publicKey);

    let wallet2 = wallets["wallet2"];
    await requestAirdropForWallet(wallet2.publicKey, 1);
    await checkBalanceForWallet(wallet2.publicKey);

    let copier = wallets["copier"];
    await requestAirdropForWallet(copier.publicKey, 1);
    await checkBalanceForWallet(copier.publicKey);


    // Initialize token manager
    const tokenManager = new TokenManager();


    // Create a test token - with wallet1 as the creator
    try {
        const testToken = await tokenManager.createToken(wallet1, Config.tokenName);
        console.log("Test token created successfully");
    } catch (error) {
        console.error("Error creating test token:", error);
    }

}

initialize().catch(console.error);