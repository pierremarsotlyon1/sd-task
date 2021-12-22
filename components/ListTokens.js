import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react"
import { xSDT_ABI } from "../tools/abis";
import { loadByContract } from "../tools/tokensUtils";
import { WalletNotConnected } from "./WalletNotConnected";

export const ListTokens = () => {
    const { active, account, library } = useWeb3React();
    const [tokens, setTokens] = useState([]);

    useEffect(() => {
        async function run() {
            if (!active || tokens.length) {
                return;
            }

            // Get xSDT in the user wallet by calling a smart contract method
            const xSDT = await loadByContract(library, xSDT_ABI, "0xac14864ce5a98af3248ffbf549441b04421247d3", account);

            // ETH balance
            const eth = await library.eth.getBalance(account);

            setTokens([
                { id: 'xSDT', balance: xSDT },
                { id: 'ETH', balance: library.utils.fromWei(eth, "ether") }
            ]);
        }
        run();
    });

    if (!active) {
        return <WalletNotConnected/>;
    } else {
        return (
            <div className="flex flex-row items-center justify-center mt-8">
                <ul className="flex flex-col items-left justify-center">
                    {
                        tokens.map(token => <li className="mb-4 border-b-2 pb-4 border-dotted" key={token.id}>{token.balance} {token.id}</li>)
                    }
                </ul>
            </div>
        )
    }
}