import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { injected } from "../tools/metamask/connector";
import { getPhantomProvider } from "../tools/phantom/phantom";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import Solana from "@ledgerhq/hw-app-solana";
import { setLedgerProvider } from "../tools/ledger";
import { getWalletType, LEGDER, METAMASK, onDisconnect, PHANTOM, setWalletType } from "../tools/wallet";

export const BtnWallet = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React();
    const [hidden, setHidden] = useState(true);
    const [walletConnected, setWalletConnected] = useState(false);

    const openDialog = () => setHidden(false);
    const closeDialog = () => setHidden(true);

    const onConnect = type => {
        setWalletType(type);
        setWalletConnected(true);
    };

    const disconnect = () => {
        switch (getWalletType()) {
            case METAMASK:
                deactivate();
                break;
            case PHANTOM:
                window.solana.disconnect();
                break;
            case LEGDER:
                setLedgerProvider(null);
                break;
        }
        setHidden(true);
        setWalletConnected(false);
        onDisconnect();
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
    const [ledgerSupported, setLedgerSupported] = useState(null);

    const styles = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full " + (props.hidden ? "hidden" : "");

    useEffect(() => {
        if(phantomAvailable !== null || !window) {
            return;
        }

        setPhantomAvailable(!!getPhantomProvider());
        TransportWebUSB.isSupported()
                    .then(isSupported => {
                        setLedgerSupported(isSupported);
                    });
    });

    const connect = async (type) => {
        switch (type) {
            case METAMASK:
                await activate(injected);
                break;
            case PHANTOM:
                try {
                    await window.solana.connect();
                } catch (err) {
                    console.error(err);
                }
                break;
            case LEGDER:
                const transport = await TransportWebUSB.create();
                const solana = new Solana(transport);
                setLedgerProvider(solana);
                break;
            default:
                console.error("unknow wallet type");
        }

        props.onConnect(type);
        props.onClose();
    };

    let blockPhantom = null;

    if (phantomAvailable) {
        blockPhantom = <li
            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
            onClick={() => connect(PHANTOM)}
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

    let ledger = null;
    if (ledgerSupported) {
        ledger = <li
            className="m-2 text-base text-black cursor-pointer hover:text-gray-500"
            onClick={() => connect(LEGDER)}
        >Ledger</li>;
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
                            onClick={() => connect(METAMASK)}
                        >Metamask</li>
                        {blockPhantom}
                        {ledger}
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