import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react"
import { xSDT_ABI } from "../tools/abis";
import { loadByContract } from "../tools/tokensUtils";

export const ListTokens = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();
    const [tokens, setTokens] = useState([]);

    useEffect(() => {
        async function run() {
            if (!active || tokens.length) {
                return;
            }

            // Get xSDT in the user wallet by calling a smart contract method
            const xSDT = await loadByContract(library, xSDT_ABI, "0xac14864ce5a98af3248ffbf549441b04421247d3", account);
            setTokens([{ id: 'xSDT', balance: xSDT }]);
        }
        run();
    });

    if (!active) {
        return (
            <>
                <p>Loading ...</p>
            </>
        )
    } else {
        return (
            <>
                {
                    tokens.map(token => <p key={token.id}>{token.balance} {token.id}</p>)
                }
            </>
        )
    }
}