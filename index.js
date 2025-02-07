require('module-alias/register');

const { loadWalletByWalletId, loadWalletsFromDirectory, checkBalancesForWallets } = require('@src/core/wallets');
const { TradeMonitor } = require('@src/core/trade-monitor');
const { Config } = require('@src/core/config');
const logger = require('@src/core/logger');

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
    logger.info(`Logging wallet balances for all ${Object.keys(allWallets).length} wallets`);
    await checkBalancesForWallets(allWallets);

    let monitoredWallets = await loadMonitoredWallets();
    const copyWallet = await loadWalletByWalletId(Config.copyWalletId);

    // console.log("Monitored wallets:", monitoredWallets);
    // console.log("Copy wallet:", copyWallet);

    
    // Start monitoring
    const tradeMonitor = new TradeMonitor(monitoredWallets, copyWallet, Config.threshold, Config.timeWindow);
    await tradeMonitor.startMonitoring();
    logger.info('Monitoring service is running. Press Ctrl+C to stop.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT. Cleaning up...');
        await tradeMonitor.stopMonitoring();
        process.exit(0);
    });
}

// Handle any unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

// Run the main function
main().catch((error) => {
    logger.error('Application failed:', error);
});