export async function loadByContract(web3, ABI, contractAddress, address) {
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const balance = await contract.methods.balanceOf(address).call();
    const decimals = await contract.methods.decimals().call();
    return parseFloat(balance) / Math.pow(10, decimals);
}