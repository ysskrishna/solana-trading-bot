const { loadWalletByWalletId, loadWalletsFromDirectory, checkBalancesForWallets } = require('./wallets');
const { TradeMonitor } = require('./trade-monitor');
const { Config } = require('./config');

async function loadMonitoredWallets() {
    let monitoredWallets = {};
    for (let walletId of Config.monitoredWalletIds) {
        let wallet = await loadWalletByWalletId(walletId);
        monitoredWallets[walletId] = wallet;
    }
    return monitoredWallets;
}


async function main() {
    let allWallets = await loadWalletsFromDirectory();
    console.log(`Logging wallet balances for all ${allWallets.length} wallets`);
    await checkBalancesForWallets(allWallets);


    let monitoredWallets = await loadMonitoredWallets();
    const copyWallet = await loadWalletByWalletId(Config.copyWalletId);


    // console.log("Monitored wallets:", monitoredWallets);
    // console.log("Copy wallet:", copyWallet);
    
    const monitor = new TradeMonitor(monitoredWallets, copyWallet, Config.threshold, Config.timeWindow);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT. Cleaning up...');
        await monitor.stopMonitoring();
        process.exit(0);
    });

    // Run the test cases with real-time monitoring
    await monitor.runTestCases();


    console.log(`AFTER TESTING: Logging wallet balances for all ${allWallets.length} wallets`);
    await checkBalancesForWallets(allWallets);
}

main().catch(console.error);