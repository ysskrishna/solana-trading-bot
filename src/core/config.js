const path = require('path');
const appRoot = require('app-root-path');

const Config = {
    network: 'devnet',
    threshold: 2,
    timeWindow: 15,
    copyWalletId: 'copier',
    monitoredWalletIds: ['wallet1', 'wallet2', 'wallet3'],
    tokenName: 'XyzToken',
    walletsDirectory: path.join(appRoot.path, 'data/wallets'),
    tokensDirectory: path.join(appRoot.path, 'data/tokens'),
    logsDirectory: path.join(appRoot.path, 'logs')
};

module.exports = { Config }; 