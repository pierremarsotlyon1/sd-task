import { useWeb3React } from "@web3-react/core";
import { injected } from "../tools/metamask/connector";

export const BtnWallet = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();

    const connect = () => activate(injected);
    const disconnect = () => deactivate();

    if (active) {
        return (
            <button className='mx-8 bg-purple-600 p-1 rounded text-white text-1sm' onClick={disconnect}>
                Disconnect
            </button>
        )
    } else {
        return (
            <button className='mx-8 bg-purple-600 p-1 rounded text-white text-1sm' onClick={connect}>
                Connect wallet
            </button>
        )
    }
}