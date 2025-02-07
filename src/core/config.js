const path = require('path');
const appRoot = require('app-root-path');

const Config = {
    network: 'devnet',
    threshold: 2,
    timeWindow: 15,
    copyWalletId: 'copier',
    monitoredWalletIds: ['wallet1', 'wallet2', 'wallet3'],
    xyzToken: 'XyzToken',
    abcToken: 'AbcToken',
    walletsDirectory: path.join(appRoot.path, 'data/wallets'),
    tokensDirectory: path.join(appRoot.path, 'data/tokens'),
    logsDirectory: path.join(appRoot.path, 'logs')
};


const tokenAuthorityMap = {
    [Config.xyzToken]: 'wallet1',
    [Config.abcToken]: 'wallet1'
}

const tokenPublicKeyTokenNameMap = {
    "MKwuEpRrheRwUAXsrSJ27wShUdNeUbiA6633AGfAXpr": Config.xyzToken,
    "2SyJp8Aa1k1i7nRkJZM4zyC9jpWC3A5QaZHPBF2cwVyE": Config.abcToken
}

module.exports = { Config, tokenAuthorityMap, tokenPublicKeyTokenNameMap }; 