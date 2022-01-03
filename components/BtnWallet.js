import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { injected } from "../tools/metamask/connector";
import { getPhantomProvider } from "../tools/phantom/phantom";
import { isWalletConnected } from "../tools/wallet";

export const BtnWallet = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();
    const [hidden, setHidden] = useState(true);
    const [type, setType] = useState(-1);
    const [walletConnected, setWalletConnected] = useState(false);

    const openDialog = () => setHidden(false);
    const closeDialog = () => setHidden(true);

    const onConnect = type => {
        setType(type);
        setWalletConnected(true);
    };

    const disconnect = () => {
        switch (type) {
            case 1:
                deactivate();
                break;
            case 2:
                window.solana.disconnect();
                break;
            case 3:
                //Ledger
                break;
        }
        setHidden(true);
        setWalletConnected(false);
    };

    if (walletConnected) {
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
                <DialogSelectWallet hidden={hidden} onClose={closeDialog} onConnect={onConnect} />
            </>
        )
    }
}

const DialogSelectWallet = (props) => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();
    const [phantomAvailable, setPhantomAvailable] = useState(null);

    const styles = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full " + (props.hidden ? "hidden" : "");

    useEffect(() => {
        console.log(phantomAvailable);
        console.log(window);
        console.log(phantomAvailable !== null || !window);
        if(phantomAvailable !== null || !window) {
            return;
        }

        setPhantomAvailable(!!getPhantomProvider());
    });

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
            .then(() => props.onConnect(type))
            .finally(() => props.onClose());
    };

    let blockPhantom = null;

    if (phantomAvailable) {
        blockPhantom = <li
            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
            onClick={() => connect(2)}
        >Phantom</li>;
    }
    else if (phantomAvailable === false) {
        blockPhantom = <li
            className="m-2 text-base text-red-500"
        >Phantom unvailable</li>;
    } else {
        blockPhantom = <li
            className="m-2 text-base text-gray-500"
        >Phantom fetching ...</li>;
    }

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
                        {blockPhantom}
                        <li
                            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
                            onClick={() => connect(3)}
                        >Ledger</li>
                    </ul>
                    <div className="items-center px-4 py-3">
                        <button
                            className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm focus:outline-none focus:ring-2"
                            onClick={() => props.onClose()}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
};