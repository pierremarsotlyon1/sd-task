let _pubKey = null;
let _provider = null;

export function getZelCorePublicKey() {
    return _pubKey;
}

export function setZelCorePublicKey(pubKey) {
    _pubKey = pubKey;
}

export function setZelCoreProvider(provider) {
    _provider = provider;
}

export function getZelCoreProvider() {
    return _provider;
}