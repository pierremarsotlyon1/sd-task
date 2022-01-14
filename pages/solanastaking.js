
import React from 'react';
import { getConnection, getStakeAccounts, stake, withdraw } from '../tools/solanaUtils';
import { DEVNET, getBalance, getProvider, getPublicKey, getWalletType, MAINNET, PHANTOM, removeOnWalletConnect, removeOnWalletDisconnect, setNetwork, setOnWalletConnect, setOnWalletDisconnect, UNDEFINED } from '../tools/wallet';
const web3 = require("@solana/web3.js");

export default class Bonds extends React.Component {

    state = {
        isConnected: false,
        airdropPending: false,
        publicKey: "",
        balance: 0,
        error: null,
        stakeState: "",
        balanceToStake: "",
        stakeAccounts: [],
        network: -1,
        loading: false,
        idRefreshAuto: -1,
    };

    componentDidMount() {
        setOnWalletConnect(this.onConnect);
        setOnWalletDisconnect(this.handleDisconnect);

        if (getWalletType !== UNDEFINED) {
            this.onConnect();
        }

        // Refresh data automatically
        const idRefreshAuto = setInterval(this.setStakeAccounts.bind(this), 60 * 1000);
        this.setState({ idRefreshAuto });
    }

    componentWillUnmount() {
        removeOnWalletConnect(this.onConnect);
        removeOnWalletDisconnect(this.handleDisconnect);

        clearInterval(this.state.idRefreshAuto);
    }

    onConnect = async () => {
        if (getWalletType() === PHANTOM) {
            const provider = await getProvider();
            provider.on("connect", this.handleConnect);
            provider.on('disconnect', this.handleDisconnect);
        }

        const pubkey = await getPublicKey();
        if (pubkey && this.state.network === -1) {
            this.setState({ isConnected: true });
            return;
        }
        
        if (pubkey) {
            this.setState({ isConnected: true, publicKey: pubkey.toString() }, () => this.refreshStakingInfo());
        }
    }

    /**
     * Get SOL on devnet
     */
    requestAirdrop = () => {
        if (this.state.airdropPending || this.state.network !== DEVNET) {
            return;
        }

        this.setState({ airdropPending: true }, () => {
            const connection = getConnection();
            connection.requestAirdrop(
                window.solana.publicKey,
                web3.LAMPORTS_PER_SOL,
            )
                .then(airdropSignature => {
                    connection.confirmTransaction(airdropSignature)
                        .then(() => this.setBalance())
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
    setBalance = async () => {
        const balance = await getBalance();
        this.setState({ balance: balance / web3.LAMPORTS_PER_SOL });
    };

    /**
     * Get all info about stake accounts + rewards
     */
    setStakeAccounts = async () => {
        const stakeAccounts = await getStakeAccounts();
        this.setState({ stakeAccounts });
    }

    /**
     * Check if phantom is connected and fetch balance
     */
    handleConnect = async () => {
        const provider = await getProvider();
        this.setState(
            { isConnected: !!provider },
            () => this.refreshStakingInfo()
        );
    };

    handleDisconnect = async () => {
        this.setState(
            {
                isConnected: false,
                airdropPending: false,
                publicKey: "",
                balance: 0,
                error: null,
                stakeState: "",
                balanceToStake: "",
                stakeAccounts: []
            },
        );
    };

    /**
     * Stake token on validator
     */
    doStake = async () => {
        if (this.state.balance === 0) {
            return;
        }

        await stake(parseFloat(this.state.balanceToStake));

        // Refresh data and UI
        this.refreshStakingInfo();
    };

    /**
     * Withdraw few SOL from delegator
     */
    doWithdraw = async (pubKey, stakeBalance) => {
        await withdraw(pubKey, stakeBalance);

        // Refresh data and UI
        this.refreshStakingInfo();
    };

    /**
     * Get staking informations
     */
    refreshStakingInfo = async () => {
        if (!this.state.isConnected) {
            return;
        }

        this.setState({ loading: true }, async () => {
            await this.setStakeAccounts();
            await this.setBalance();

            this.setState({ loading: false });
        });
    };

    /**
     * network change
     */
    networkChange = network => {
        this.setState({ network }, () => {
            setNetwork(network);
            this.onConnect();
        });
    }

    /**
     * Set the number of sol to delegate
     */
    balanceToStake = balanceToStake => this.setState({ balanceToStake });;

    /**
     * Set the max sol that can be delegate
     * Minus small amount of sol for tx
     */
    setStakingMaxBalance = () => this.setState({ balanceToStake: (this.state.balance - 0.005).toString() });

    /**
     * Display an error in the UI
     */
    showError = error => {
        this.setState({ error }, () => {
            setTimeout(() => {
                this.setState({ error: null });
            }, 5000);
        });
    }

    render() {
        if (!this.state.isConnected) {
            return <div className="flex flex-row items-center justify-center mt-8">
                <p>Wallet not connected</p>
            </div>
        }

        if (this.state.network === -1) {
            return (
                <div className="flex flex-row items-center justify-center mt-8">
                    <div className="solanadevnet">
                        <BtnNetworks selected={this.state.network} onChanged={this.networkChange} />
                    </div>
                </div>
            )
        }

        if (this.state.loading) {
            return (
                <div className="flex flex-row items-center justify-center mt-8">
                    <div className="solanadevnet">
                        <BtnNetworks selected={this.state.network} onChanged={this.networkChange} />
                        <p>Loading ...</p>
                    </div>
                </div>
            )
        }

        let airdrop = null;
        if (this.state.network === DEVNET) {
            airdrop = <button
                className='mb-8 px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                onClick={() => this.requestAirdrop()}
            >Request airdrop</button>;
        }

        return (
            <div className="flex flex-row items-center justify-center mt-8">
                <div className="solanadevnet">
                    <BtnNetworks selected={this.state.network} onChanged={this.networkChange} />
                    <div className='flex flex-col justify-center'>
                        <h3 className='text-center'>{this.state.publicKey}</h3>
                        <p className='devnet-balance'>Balance : {this.state.balance}</p>
                        {airdrop}
                    </div>

                    <div className='flex flex-col justify-center mt-6'>
                        <div className='flex flex-row justify-between'>
                            <input className='text-black' onChange={e => this.balanceToStake(e.target.value)} type="text" value={this.state.balanceToStake} />
                            <button onClick={() => this.setStakingMaxBalance()}>Max</button>
                        </div>
                        <button
                            className='px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                            onClick={() => this.doStake()}
                            disabled={!this.state.balanceToStake || this.state.balanceToStake === "0"}
                        >Stake</button>
                    </div>

                    <div className='flex flex-col justify-center mt-6'>
                        <h3 className='mt-5 text-center'>Stake accounts</h3>
                        <ul>
                            {
                                this.state.stakeAccounts.map((stakeAccount, index) => {
                                    return <li key={index} className='mb-8'>
                                        <div className='flex flex-col'>
                                            <p>Balance : {stakeAccount.balance}</p>
                                            <p>Stake state : {stakeAccount.stateStake}</p>
                                            <p>Active stake : {stakeAccount.activeStake}</p>
                                            <p>Rent reserve : {stakeAccount.rentReserve}</p>
                                            <p>Rewards : {stakeAccount.rewards} </p>
                                            <button
                                                className='mt-2 px-4 py-2 bg-orange-400 text-white text-base font-medium rounded-md shadow-sm'
                                                onClick={() => this.doWithdraw(stakeAccount.pubkey, stakeAccount.account.lamports)}>
                                                Withdraw all
                                            </button>
                                        </div>
                                    </li>
                                })
                            }
                        </ul>
                        <button
                            className='mt-2 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                            onClick={() => this.refreshStakingInfo()}
                        >Refresh data</button>
                    </div>
                    <p className='text-red text-center'>{this.state.error}</p>
                </div>
            </div>
        )
    }
}

const BtnNetworks = (props) => {

    const stylesMainnet = 'mb-8 px-4 py-2 text-white text-base font-medium rounded-md w-full shadow-sm '
        + (props.selected === MAINNET ? "bg-green-500" : "bg-gray-500");

    const stylesDevnet = 'mb-8 px-4 py-2 text-white text-base font-medium rounded-md w-full shadow-sm '
        + (props.selected === DEVNET ? "bg-green-500" : "bg-gray-500");

    return (
        <div className='flex flex-row justify-around'>
            <button
                className={stylesMainnet}
                onClick={() => props.onChanged(MAINNET)}
            >Mainnet</button>
            <button
                className={stylesDevnet}
                onClick={() => props.onChanged(DEVNET)}
            >Devnet</button>
        </div>
    )
}