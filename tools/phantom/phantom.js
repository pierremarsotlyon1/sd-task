const web3 = require("@solana/web3.js");

export const getPhantomProvider = () => {
    try {
        if ("solana" in window) {
            const provider = window.solana;
            if (provider.isPhantom) {
                return provider;
            }
        }
        return null;
    }
    catch (e) {
        // Window undefined
        return null;
    }
};

export const isPhantomConnected = () => {
    try {
        if ("solana" in window) {
            return window.solana.isConnected;
        }
        return false;
    }
    catch (e) {
        // Window undefined
        return null;
    }
}

export const getPhantomPublicKey = () => {
    try {
        if ("solana" in window) {
            return window.solana?.publicKey.toString();
        }
        return null;
    }
    catch (e) {
        return null;
    }
};

export function getConnection() {
    return new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
}

export async function getStakeAccounts(connection, from) {
    return await connection.getProgramAccounts(new web3.PublicKey("Stake11111111111111111111111111111111111111"),
        {
            encoding: "base64",
            commitment: "confirmed",
            filters: [
                {
                    memcmp: {
                        bytes: from.toString(),
                        offset: 12
                    }
                }
            ]
        });
}