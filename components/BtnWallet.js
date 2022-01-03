import { useWeb3React } from "@web3-react/core";
import { useState } from "react";
import { injected } from "../tools/metamask/connector";
import { getPhantomProvider } from "../tools/phantom/phantom";
import { isWalletConnected } from "../tools/wallet";

export const BtnWallet = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();
    const [hidden, setHidden] = useState(true);

    const openDialog = () => setHidden(false);
    const closeDialog = () => setHidden(true);

    const disconnect = () => deactivate();

    if (isWalletConnected(active)) {
        return (
            <button className='mx-8 bg-purple-600 p-1 rounded text-white text-1sm' onClick={disconnect}>
                Disconnect
            </button>
        )
    } else {
        return (
            <>
                <button className='mx-8 bg-purple-600 p-1 rounded text-white text-1sm' onClick={openDialog}>
                    Connect wallet
                </button>
                <DialogSelectWallet hidden={hidden} onClose={closeDialog} />
            </>
        )
    }
}

const DialogSelectWallet = (props) => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();

    const styles = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full " + (props.hidden ? "hidden" : "");

    const connect = (type) => {
        let promise = Promise.resolve();

        switch (type) {
            case 1:
                promise = activate(injected);
                break;
            case 2:
                try {
                    promise = window.solana.connect();
                } catch (err) {
                    console.error(err);
                }
                break;
            case 3:
                //Ledger
                break;
            default:
                console.error("unknow wallet type");
        }

        promise
            .then(resp => {
                switch (type) {
                    case 1:
                        break;
                    case 2:
                        console.log(resp.publicKey.toString());
                        break;
                    case 3:
                        //Ledger
                        break;
                }

            })
            .finally(() => props.onClose());
    };

    const havePhantomExtension = !!getPhantomProvider();

    return (
        <div className={styles}>
            <div
                className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            >
                <div className="mt-3 text-center">
                    <ul className="mt-2 px-7 py-3">
                        <li
                            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
                            onClick={() => connect(1)}
                        >Metamask</li>
                        {
                            havePhantomExtension && <li
                                className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
                                onClick={() => connect(2)}
                            >Phantom</li>
                        }
                        <li
                            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
                            onClick={() => connect(3)}
                        >Ledger</li>
                    </ul>
                    <div className="items-center px-4 py-3">
                        <button
                            className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                            onClick={() => props.onClose()}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
};