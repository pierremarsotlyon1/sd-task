const web3 = require("@solana/web3.js");
import { getLedgerProvider } from "./ledger";
import { getPhantomProvider, isPhantomConnected } from "./phantom/phantom";
import { getConnection } from "./solanaUtils";

export const UNDEFINED = -1;
export const METAMASK = 1;
export const PHANTOM = 2;
export const LEGDER = 3;
export const MAINNET = 1;
export const DEVNET = 2;
let currentNetwork = -1;

let walletType = UNDEFINED;
let listenersOnConnect = [];
let listenersOnDisconnect = [];

export function setNetwork(network) {
    currentNetwork = network;
}

export function getNetwork() {
    return currentNetwork;
}

export function setOnWalletConnect(listener) {
    listenersOnConnect.push(listener);
}

export function removeOnWalletConnect(listener) {
    listenersOnConnect = listenersOnConnect.filter(l => l !== listener);
}

export function setOnWalletDisconnect(listener) {
    listenersOnDisconnect.push(listener);
}

export function removeOnWalletDisconnect(listener) {
    listenersOnDisconnect = listenersOnDisconnect.filter(l => l !== listener);
}

export function setWalletType(type) {
    walletType = type;

    if (walletType !== -1) {
        for (const listener of listenersOnConnect) {
            listener();
        }
    }
}

export function onDisconnect() {
    for (const listener of listenersOnDisconnect) {
        listener();
    }
}

export function getWalletType() {
    return walletType;
}

export function getProvider() {
    switch (walletType) {
        case METAMASK:
            return null;
        case PHANTOM:
            return getPhantomProvider();
        case LEGDER:
            return getLedgerProvider();
    }
}

export function isWalletConnected(activeMetamask) {
    return activeMetamask || isPhantomConnected();
}

export async function getPublicKey() {
    switch (walletType) {
        case PHANTOM:
            return window.solana.publicKey;
        case LEGDER:
            const solana = await getProvider();
            const r = await solana.getAddress("44'/501'"); // Solflare BIP, see https://medium.com/@josh.wolff.7/derivation-paths-on-solana-fb08d3dd09f1
            return new web3.PublicKey(r.address);
    }

    return null;
}

export async function getBalance() {
    const provider = await getProvider();
    if (!provider) {
        return 0;
    }

    const pukKey = await getPublicKey();
    const connection = getConnection();
    const balance = await connection.getBalance(pukKey);
    return balance;
}