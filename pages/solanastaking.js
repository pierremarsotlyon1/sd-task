
import React from 'react';
import { getConnection, getPhantomProvider, getPhantomPublicKey, getStakeAccounts, isPhantomConnected } from '../tools/phantom/phantom';
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
    };

    componentDidMount() {
        const provider = getPhantomProvider();
        if (provider) {
            window.solana.on("connect", this.handleConnect);
            window.solana.on('disconnect', this.handleConnect);

            this.setBalance();
            this.setStakeAccounts();
            this.setState({ isConnected: isPhantomConnected() });
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
        if (!window?.solana?.publicKey) {
            return;
        }
        const connection = getConnection();
        const balance = await connection.getBalance(window.solana.publicKey);
        this.setState({ balance: balance / 1000000000 });
    };

    /**
     * Get all info about stake accounts + rewards
     */
    setStakeAccounts = async () => {
        if (!window?.solana?.publicKey) {
            return;
        }

        const connection = getConnection();
        const stakeAccounts = await getStakeAccounts(connection, window.solana.publicKey);

        for (const stakeAccount of stakeAccounts) {
            const stakeBalance = await connection.getBalance(stakeAccount.pubkey);
            stakeAccount.stakeBalance = stakeAccount.account.lamports / 1000000000;
            stakeAccount.rewards = stakeBalance / 1000000000 - stakeAccount.stakeBalance;
        }
        this.setState({ stakeAccounts });
    }

    /**
     * Check if phantom is connected and fetch balance
     */
    handleConnect = () => {
        this.setState(
            { isConnected: isPhantomConnected() },
            () => this.refreshStakingInfo()
        );
    };

    /**
     * Stake token on validator
     */
    stake = async () => {
        if (this.state.balance === 0) {
            return;
        }

        const connection = getConnection();
        const fromPublicKey = window.solana.publicKey;

        // Create stake account to manage the staking
        const stakeAccount = web3.Keypair.generate();

        // Balance to stake
        const balanceToStake = parseFloat(this.state.balanceToStake);

        let blockhashObj = await connection.getRecentBlockhash();
        const createAccountTransaction = new web3.Transaction({
            feePayer: fromPublicKey,
            recentBlockhash: blockhashObj.blockhash,
        }).add(
            web3.StakeProgram.createAccount({
                fromPubkey: fromPublicKey,
                authorized: new web3.Authorized(fromPublicKey, fromPublicKey),
                lamports: balanceToStake * 1000000000,
                lockup: new web3.Lockup(0, 0, fromPublicKey),
                stakePubkey: stakeAccount.publicKey
            })
        );

        // stakeAccount must sign the tx because it's a new account
        createAccountTransaction.partialSign(stakeAccount);

        let signed = await window.solana.signTransaction(createAccountTransaction);
        let signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        // Check that stake is available

        const stakeBalance = await connection.getBalance(stakeAccount.publicKey);
        console.log(`Stake balance: ${stakeBalance}`)

        // We can verify the state of our stake. This may take some time to become active
        const stakeState = await connection.getStakeActivation(stakeAccount.publicKey);
        console.log(`Stake Stake: ${stakeState.state}`);

        // To delegate our stake, we get the current vote accounts and choose the first
        const voteAccount = await this.getVoteAccount();
        const votePubkey = new web3.PublicKey(voteAccount.votePubkey);

        // We can then delegate our stake to the voteAccount
        blockhashObj = await connection.getRecentBlockhash();
        const delegateTransaction = new web3.Transaction({
            feePayer: fromPublicKey,
            recentBlockhash: blockhashObj.blockhash,
        }).add(
            web3.StakeProgram.delegate({
                stakePubkey: stakeAccount.publicKey,
                authorizedPubkey: fromPublicKey,
                votePubkey: votePubkey,
            })
        );

        signed = await window.solana.signTransaction(delegateTransaction);
        signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        console.log("staking done");

        // Refresh data and UI
        this.refreshStakingInfo();
    };

    /**
     * Withdraw few SOL from delegator
     */
    withdraw = async (pubKey, stakeBalance) => {
        console.log("stakeBalance : " + stakeBalance);
        const connection = getConnection();
        const fromPublicKey = window.solana.publicKey;
        const blockhashObj = await connection.getRecentBlockhash();

        // If stake account desactivated, we can withdraw funds directly
        let stakeState = await connection.getStakeActivation(pubKey);
        if (stakeState.state !== "inactive" && stakeState.state !== "deactivating") {
            const deactivateTransaction = new web3.Transaction({
                feePayer: fromPublicKey,
                recentBlockhash: blockhashObj.blockhash,
            }).add(
                web3.StakeProgram.deactivate({
                    stakePubkey: pubKey,
                    authorizedPubkey: fromPublicKey,
                })
            );

            let signed = await window.solana.signTransaction(deactivateTransaction);
            let signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature);
        }

        stakeState = await connection.getStakeActivation(pubKey);
        if (stakeState.state === "inactive") {
            // Withdraw all stake funds
            const withdrawTransaction = new web3.Transaction({
                feePayer: fromPublicKey,
                recentBlockhash: blockhashObj.blockhash,
            }).add(
                web3.StakeProgram.withdraw({
                    stakePubkey: pubKey,
                    authorizedPubkey: fromPublicKey,
                    toPubkey: fromPublicKey,
                    lamports: stakeBalance,
                })
            );

            let signed = await window.solana.signTransaction(withdrawTransaction);
            let signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature);
        }
        else {
            this.showError("You could withdraw your funds when your stake account will be inactive");
        }

        this.refreshStakingInfo();
    };

    getVoteAccount = async () => {
        const connection = getConnection();
        const voteAccounts = await connection.getVoteAccounts();
        return voteAccounts.current[0];
    }

    /**
     * Get staking informations
     */
    refreshStakingInfo = async () => {
        this.setStakeAccounts();
        this.setBalance();
    };

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
                    <div className='flex flex-col justify-center'>
                        <h3 className='text-center'>Devnet {getPhantomPublicKey()}</h3>
                        <p className='devnet-balance'>Balance : {this.state.balance}</p>
                        <button
                            className='mb-8 px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                            onClick={() => this.requestAirdrop()}
                        >Request airdrop</button>
                    </div>

                    <div className='flex flex-col justify-center mt-6'>
                        <div className='flex flex-row justify-between'>
                            <input className='text-black' onChange={e => this.balanceToStake(e.target.value)} type="text" value={this.state.balanceToStake} />
                            <button onClick={() => this.setStakingMaxBalance()}>Max</button>
                        </div>
                        <button
                            className='px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                            onClick={() => this.stake()}
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
                                            <p>SOL stake : {stakeAccount.stakeBalance}</p>
                                            <p>Rewards : {stakeAccount.rewards} </p>
                                            <button
                                                className='mt-2 px-4 py-2 bg-orange-400 text-white text-base font-medium rounded-md shadow-sm'
                                                onClick={() => this.withdraw(stakeAccount.pubkey, stakeAccount.account.lamports)}>
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