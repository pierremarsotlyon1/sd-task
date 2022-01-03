import { isPhantomConnected } from "./phantom/phantom";

export function isWalletConnected(activeMetamask) {
    return activeMetamask || isPhantomConnected();
}