const { Connection, clusterApiUrl, PublicKey, Keypair } = require('@solana/web3.js');
const { createMint, createAssociatedTokenAccount, getAssociatedTokenAddress, mintToChecked, getMint, burnChecked } = require('@solana/spl-token');
const fs = require('fs');
const { Config } = require('./config');

class TokenManager {
    TOKEN_DECIMALS = 9;
    constructor() {
        this.connection = new Connection(clusterApiUrl(Config.network), 'confirmed');
        this.tokensDirectory = Config.tokensDirectory;
        this.ensureTokensDirectory();
    }


    ensureTokensDirectory() {
        if (!fs.existsSync(this.tokensDirectory)) {
            fs.mkdirSync(this.tokensDirectory);
        }
    }

    // Create a new token and save its info
    async createToken(wallet, name) {
        try {
            const keypair = this.getKeypairFromWallet(wallet);
            const mintAuthority = keypair;
            const freezeAuthority = keypair;


            // Create mint account
            const mint = await createMint(
                this.connection,
                keypair,
                mintAuthority.publicKey,
                freezeAuthority.publicKey,
                this.TOKEN_DECIMALS
            );

            console.log("Created mintPublicKey:", mint);

            const tokenInfo = {
                name,
                publicKey: mint.toString(),
                createdAt: new Date().toISOString(),
                createdBy: wallet.publicKey,
                decimals: this.TOKEN_DECIMALS
            };


            // Save token info to disk
            this.saveTokenInfo(name, tokenInfo);
            
            console.log(`Created new token: ${name}`);
            console.log(`Mint address: ${mint.toString()}`);
            
            return mint;
        } catch (error) {
            console.error('Error creating token:', error);
            throw error;
        }
    }

    async getTokenMint(name) {
        const tokenInfo = this.loadTokenInfo(name);
        const tokenPublicKey =  new PublicKey(tokenInfo.publicKey);
        let mintAccount = await getMint(this.connection, tokenPublicKey);
        console.log("get token mint account:", mintAccount);
        return mintAccount;
    }

    // Save token information to disk
    saveTokenInfo(name, tokenInfo) {
        const filename = `${this.tokensDirectory}/${name}.json`;
        fs.writeFileSync(filename, JSON.stringify(tokenInfo, null, 2));
    }

    // Load token information from disk
    loadTokenInfo(name) {
        try {
            const filename = `${this.tokensDirectory}/${name}.json`;
            if (!fs.existsSync(filename)) {
                throw new Error(`Token ${name} not found`);
            }
            return JSON.parse(fs.readFileSync(filename, 'utf8'));
        } catch (error) {
            console.error(`Error loading token ${name}:`, error);
            throw error;
        }
    }

    // Load all tokens
    loadAllTokens() {
        try {
            const tokens = {};
            const files = fs.readdirSync(this.tokensDirectory);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const name = file.replace('.json', '');
                    tokens[name] = this.loadTokenInfo(name);
                }
            }
            
            return tokens;
        } catch (error) {
            console.error('Error loading tokens:', error);
            return {};
        }
    }

    // Get or create associated token account
    async getOrCreateAssociatedTokenAccount(tokenInfo, wallet) {
        try {
            const keypair = this.getKeypairFromWallet(wallet);
            const tokenPublicKey = new PublicKey(tokenInfo.publicKey);
            const walletPublicKey = new PublicKey(wallet.publicKey);
            const associatedTokenAddress = await getAssociatedTokenAddress(
                tokenPublicKey,
                walletPublicKey
            );

            try {
                const tokenAccount = await this.connection.getAccountInfo(associatedTokenAddress);
                if (!tokenAccount) {
                    console.log(`initial wallet ${walletPublicKey} Token Account has found`);
                    await createAssociatedTokenAccount(
                        this.connection,
                        keypair,
                        tokenPublicKey,
                        walletPublicKey
                    );
                }
            } catch (error) {
                console.log(`Error: creating new wallet ${walletPublicKey} Token Account`);
                await createAssociatedTokenAccount(
                    this.connection,
                    keypair,
                    tokenPublicKey,
                    walletPublicKey
                );
            }

            console.log(`Associated Token Address for ${walletPublicKey}: ${associatedTokenAddress}`); 
            return associatedTokenAddress;
        } catch (error) {
            console.error('Error getting/creating associated token account:', error);
            throw error;
        }
    }

    // Helper method to get keypair from wallet data
    getKeypairFromWallet(wallet) {
        return Keypair.fromSecretKey(new Uint8Array(wallet.secretKey));
    }

    async mintTokens(tokenInfo, wallet, mintAuthorityWallet, amount) {
        try {
            const tokenPublicKey = new PublicKey(tokenInfo.publicKey);
            const tokenAccountAddress = await this.getOrCreateAssociatedTokenAccount(tokenInfo, wallet);

            const adjustedAmount = BigInt(Math.floor(amount * Math.pow(10, tokenInfo.decimals)));
            console.log(`Minting ${amount} tokens (${adjustedAmount} base units)`);
            
            let txhash = await mintToChecked(
                this.connection,
                this.getKeypairFromWallet(wallet),
                tokenPublicKey,
                tokenAccountAddress,
                this.getKeypairFromWallet(mintAuthorityWallet),
                adjustedAmount,
                tokenInfo.decimals
            );
            console.log(`Minted tokens txhash: ${txhash}`);

        } catch (error) {
            console.error('Error minting tokens:', error);
            throw error;
        }
    }

    async burnTokens(tokenInfo, wallet, mintAuthorityWallet, amount) {
        try {
            const tokenPublicKey = new PublicKey(tokenInfo.publicKey);
            const tokenAccountAddress = await this.getOrCreateAssociatedTokenAccount(tokenInfo, wallet);
            
            const adjustedAmount = BigInt(Math.floor(amount * Math.pow(10, tokenInfo.decimals)));
            console.log(`Burning ${amount} tokens (${adjustedAmount} base units)`);
            
            let txhash = await burnChecked(
                this.connection,
                this.getKeypairFromWallet(wallet),
                tokenPublicKey,
                tokenAccountAddress,
                this.getKeypairFromWallet(mintAuthorityWallet),
                adjustedAmount,
                tokenInfo.decimals
            );
            console.log(`Burned tokens txhash: ${txhash}`);

        } catch (error) {
            console.error('Error burning tokens:', error);
            throw error;
        }
    }

    async executeTokenTransaction(wallet, tokenName, action, mintAuthorityWallet, amount) {
        try {
            const tokenInfo = this.loadTokenInfo(tokenName);
            if (action === 'buy') {
                await this.mintTokens(tokenInfo, wallet, mintAuthorityWallet, amount);
            } else if (action === 'sell') {
                await this.burnTokens(tokenInfo, wallet, mintAuthorityWallet, amount);
            } else {
                throw new Error(`Invalid action: ${action}. Must be 'buy' or 'sell'`);
            }
        } catch (error) {
            console.error('Error executing token transaction:', error);
            throw error;
        }
    }
}

module.exports = { TokenManager }; 