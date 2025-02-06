const { loadAllWallets, checkWalletBalances } = require('./wallets');
const { TradeMonitor } = require('./trade-monitor');

async function main() {
    let wallets = await loadAllWallets();
    // console.log("All wallets loaded:", wallets);    
    await checkWalletBalances(wallets);


    const copyWallet = wallets['wallet2'];

    const monitoredWallets = { ...wallets };
    delete monitoredWallets['wallet2'];

    console.log("Monitored wallets:", monitoredWallets);
    console.log("Copy wallet:", copyWallet);
    
    const monitor = new TradeMonitor(monitoredWallets, copyWallet, 2, 15);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT. Cleaning up...');
        await monitor.stopMonitoring();
        process.exit(0);
    });

    // Run the test cases with real-time monitoring
    await monitor.runTestCases();
}

main().catch(console.error);