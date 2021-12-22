export async function loadByContract(web3, ABI, contractAddress, address) {
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const balance = await contract.methods.balanceOf(address).call();
    const decimals = await contract.methods.decimals().call();
    return (parseFloat(balance) / Math.pow(10, decimals)).toFixed(2);
}

export async function getSDTPrice() {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stake-dao&vs_currencies=usd");
    const data = await res.json();
    return data["stake-dao"].usd;
}

export async function getMaxBondSize(web3, ABI, contractAddress) {
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const maxBondSize = await contract.methods.maxPayout().call();
    return (parseFloat(maxBondSize) / Math.pow(10, 18)).toFixed(2);
}

export async function getAdjustment(web3, ABI, contractAddress) {
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const adjustment = await contract.methods.adjustment().call();
    return parseInt(adjustment.rate);
}