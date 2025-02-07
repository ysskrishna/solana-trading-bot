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

    
    // Start monitoring
    const tradeMonitor = new TradeMonitor(monitoredWallets, copyWallet, Config.threshold, Config.timeWindow);
    await tradeMonitor.startMonitoring();
    console.log('Monitoring service is running. Press Ctrl+C to stop.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT. Cleaning up...');
        await tradeMonitor.stopMonitoring();
        process.exit(0);
    });
}

main().catch(console.error);