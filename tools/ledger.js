let provider = null;

export function setLedgerProvider(p) {
    provider = p;
}

export function getLedgerProvider(){
    return provider;
}

export async function getAddress(){
    const r = await provider.getAddress("44'/501'/0'");
    return r.address;
}