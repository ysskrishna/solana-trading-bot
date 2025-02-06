const { Connection, clusterApiUrl, PublicKey, Keypair } = require('@solana/web3.js');
const { createMint, createAssociatedTokenAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');


class TokenManager {
    constructor() {
        this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        this.tokensDirectory = './tokens';
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
                9, // 9 decimals like SOL
            );

            console.log("Created mintPublicKey:", mint);

            const tokenInfo = {
                name,
                publicKey: mint.toString(),
                createdAt: new Date().toISOString(),
                createdBy: wallet.publicKey
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
                console.log("tokenAccount:", tokenAccount);
                if (!tokenAccount) {
                    await createAssociatedTokenAccount(
                        this.connection,
                        keypair,
                        tokenPublicKey,
                        walletPublicKey
                    );
                }
            } catch (error) {
                await createAssociatedTokenAccount(
                    this.connection,
                    keypair,
                    tokenPublicKey,
                    walletPublicKey
                );
            }

            console.log("associatedTokenAddress:", associatedTokenAddress);
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
}

module.exports = { TokenManager }; 