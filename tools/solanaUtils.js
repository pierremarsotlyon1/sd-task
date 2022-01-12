import { getNetwork, getProvider, getPublicKey, getWalletType, MAINNET, PHANTOM } from "./wallet";
const web3 = require("@solana/web3.js");

export function getConnection() {
    const currentNetwork = getNetwork();
    const url = currentNetwork === MAINNET ? "mainnet-beta" : "devnet";

    return new web3.Connection(web3.clusterApiUrl(url), 'confirmed');
}

export async function getStakeAccounts() {
    const from = await getPublicKey();
    if (!from) {
        return [];
    }

    const connection = getConnection();
    const stakeAccounts = await connection.getProgramAccounts(new web3.PublicKey("Stake11111111111111111111111111111111111111"),
        {
            encoding: "base64",
            commitment: "confirmed",
            filters: [
                {
                    memcmp: {
                        bytes: from.toString(),
                        offset: 12
                    }
                }
            ]
        });

    for (const stakeAccount of stakeAccounts) {
        const stakeBalance = await connection.getBalance(stakeAccount.pubkey);
        stakeAccount.stakeBalance = stakeAccount.account.lamports / 1000000000;
        stakeAccount.rewards = stakeBalance / 1000000000 - stakeAccount.stakeBalance;
    }

    return stakeAccounts;
}

export async function stake(balanceToStake) {
    const connection = getConnection();

    // To delegate our stake, we get the current vote accounts and choose the first
    const voteAccount = await getVoteAccount();
    if (!voteAccount) {
        return null;
    }

    const votePubkey = new web3.PublicKey(voteAccount.votePubkey);

    const fromPublicKey = await getPublicKey();

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
            lamports: balanceToStake * 1000000000,
            lockup: new web3.Lockup(0, 0, fromPublicKey),
            stakePubkey: stakeAccount.publicKey
        })
    );

    // stakeAccount must sign the tx because it's a new account
    createAccountTransaction.partialSign(stakeAccount);

    await sendTx(createAccountTransaction);
    /*let signed = await window.solana.signTransaction(createAccountTransaction);
    let signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);*/

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

    await sendTx(delegateTransaction);
}

async function getVoteAccount() {
    const connection = getConnection();
    const voteAccounts = await connection.getVoteAccounts();

    if (getNetwork() === MAINNET) {
        // We select the StakeDAO validator
        for (const v of voteAccounts.current) {
            if (v.votePubkey === process.env.solanaValidator) {
                return v;
            }
        }
    }
    else {
        return voteAccounts.current[0];
    }
    return null;
}

export async function withdraw(pubKey, stakeBalance){
    const connection = getConnection();
    const fromPublicKey = await getPublicKey();
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

        await sendTx(deactivateTransaction);
        /*let signed = await window.solana.signTransaction(deactivateTransaction);
        let signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);*/
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

        await sendTx(withdrawTransaction);
        /*let signed = await window.solana.signTransaction(withdrawTransaction);
        let signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);*/
    }
    else {
        return null;
        //this.showError("You could withdraw your funds when your stake account will be inactive");
    }
};

async function sendTx(tx) {
    const connection = getConnection();
    const pubkey = await getPublicKey();
    const provider = await getProvider();
    if (getWalletType() === PHANTOM) {
        const signed = await provider.signTransaction(tx);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);
    }
    else {
        const h = await tx.serializeMessage();
        const r = await provider.signTransaction("44'/501'", h);
        tx.addSignature(pubkey, r.signature);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(signature);
    }
}