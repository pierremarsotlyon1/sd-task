
import React from 'react';
import { getPhantomProvider, getPhantomPublicKey, isPhantomConnected } from '../tools/phantom/phantom';
const web3 = require("@solana/web3.js");

export default class Bonds extends React.Component {

    state = {
        isConnected: false,
        airdropPending: false,
        publicKey: "",
        balance: 0,
        error: null,
        stakeState: "",
    };

    componentDidMount() {
        const provider = getPhantomProvider();
        if (provider) {
            window.solana.on("connect", this.handleConnect);
            window.solana.on('disconnect', this.handleConnect);

            this.setBalance();
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
            const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
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
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        const balance = await connection.getBalance(window.solana.publicKey);
        this.setState({ balance: balance / 1000000000 });
    };

    /**
     * Check if phantom is connected and fetch balance
     */
    handleConnect = () => {
        this.setState(
            { isConnected: isPhantomConnected() },
            () => this.setBalance()
        );
    };

    /**
     * Stake token on validator
     */
    stake = async () => {
        if (this.state.balance === 0) {
            return;
        }

        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        const fromPublicKey = window.solana.publicKey;

        // Create stake account to manage the staking
        const stakeAccount = web3.Keypair.generate();

        let blockhashObj = await connection.getRecentBlockhash();
        const createAccountTransaction = new web3.Transaction({
            feePayer: fromPublicKey,
            recentBlockhash: blockhashObj.blockhash,
        }).add(
            web3.StakeProgram.createAccount({
                fromPubkey: fromPublicKey,
                authorized: new web3.Authorized(fromPublicKey, fromPublicKey),
                lamports: 1000000000,
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
        const voteAccounts = await connection.getVoteAccounts();
        const voteAccount = voteAccounts.current.concat(
            voteAccounts.delinquent,
        )[0];
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

        const deactivateTransaction = new web3.Transaction({
            feePayer: fromPublicKey,
            recentBlockhash: blockhashObj.blockhash,
        }).add(
            web3.StakeProgram.deactivate({
                stakePubkey: stakeAccount.publicKey,
                authorizedPubkey: fromPublicKey,
            })
        );

        signed = await window.solana.signTransaction(deactivateTransaction);
        signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);

        console.log("desactivate staking done");

        const withdrawTransaction = new web3.Transaction({
            feePayer: fromPublicKey,
            recentBlockhash: blockhashObj.blockhash,
        }).add(
            web3.StakeProgram.withdraw({
                stakePubkey: stakeAccount.publicKey,
                authorizedPubkey: fromPublicKey,
                toPubkey: fromPublicKey,
                lamports: stakeBalance,
            })
        );
        
        signed = await window.solana.signTransaction(withdrawTransaction);
        signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);
        console.log("withdraw funds done");
    };

    /**
     * Get staking informations
     */
    refreshStakingInfo = async () => {
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        const accountInfo = await connection.getAccountInfo(window.solana.publicKey);
        console.log(accountInfo);

        const accounts = await connection.getProgramAccounts(
            accountInfo.owner, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            {
              filters: [
                {
                  dataSize: 165, // number of bytes
                },
                {
                  memcmp: {
                    offset: 32, // number of bytes
                    bytes: accountInfo.owner.toString(), // base58 encoded string
                  },
                },
              ],
            }
          );
          console.log(accounts);

        console.log(accounts.filter(a => a.account.executable));
    };

    /**
     * Display an error in the UI
     */
    showError = error => {
        this.setState({error}, () => {
            setTimeout(() => {
                this.setState({error: null});
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
                    <h3 className='text-center'>Devnet {getPhantomPublicKey()}</h3>
                    <p className='devnet-balance'>Balance : {this.state.balance}</p>
                    <button
                        className='px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                        onClick={() => this.requestAirdrop()}
                    >Request airdrop</button>
                    <button
                        className='mt-2 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                        onClick={() => this.stake()}
                    >Stake my token</button>

                    <h3 className='mt-5 text-center'>Staking informations</h3>
                    <p>Stake state : {this.state.stakeState}</p>
                    <button
                        className='mt-2 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm'
                        onClick={() => this.refreshStakingInfo()}
                    >Refresh</button>
                    <p className='text-red text-center'>{this.state.error}</p>
                </div>
            </div>
        )
    }
}