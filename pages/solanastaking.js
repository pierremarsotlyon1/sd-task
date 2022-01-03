
import React from 'react';
import { getPhantomProvider, getPhantomPublicKey, isPhantomConnected } from '../tools/phantom/phantom';
const web3 = require("@solana/web3.js");

export default class Bonds extends React.Component {

    state = {
        isConnected: false,
        airdropPending: false,
        publicKey: "",
        balance: 0,
    };

    componentDidMount() {
        const provider = getPhantomProvider();
        if (provider) {
            window.solana.on("connect", this.handleConnect);
            window.solana.on('disconnect', this.handleConnect);

            this.setState({ isConnected: isPhantomConnected(), balance: this.getBalance() });
        }
    }

    /**
     * Get SOL on devnet
     */
    requestAirdrop = () => {
        if (this.state.airdropPending) {
            return;
        }

        this.setState({ airdropPending: true }, () => {
            const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
            connection.requestAirdrop(
                window.solana.publicKey,
                web3.LAMPORTS_PER_SOL,
            )
                .then(airdropSignature => {
                    connection.confirmTransaction(airdropSignature)
                        .then(() => this.getBalance())
                        .catch(err => console.error(err))
                        .finally(() => this.setState({ airdropPending: false }));
                })
                .catch(err => {
                    console.error(err);
                    this.setState({ airdropPending: false });
                });
        });
    };

    /**
     * Get wallet balance in devnet
     */
    getBalance = () => {
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        connection.getBalance(window.solana.publicKey)
            .then(balance => this.setState({balance: balance / 1000000000}))
            .catch(() => this.setState({balance: 0}));

    };

    /**
     * Check if phantom is connected and fetch balance
     */
    handleConnect = () => {
        this.setState(
            { isConnected: isPhantomConnected() },
            () => this.getBalance()
        );
    };

    render() {
        const provider = getPhantomProvider();
        if (!provider) {
            return <div className="flex flex-row items-center justify-center mt-8">
                <p>Phantom wallet not detected, please install it</p>
            </div>
        }

        if (!this.state.isConnected) {
            return <div className="flex flex-row items-center justify-center mt-8">
                <p>Phantom wallet not connected</p>
            </div>
        }

        return (
            <div className="flex flex-row items-center justify-center mt-8">
                <div className="solanadevnet">
                    <h3 className='text-center'>Devnet {getPhantomPublicKey()}</h3>
                    <p className='devnet-balance'>{this.state.balance}</p>
                    <button
                        className='px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                        onClick={() => this.requestAirdrop()}
                    >Request airdrop</button>
                </div>
            </div>
        )
    }
}