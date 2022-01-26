import { getNetwork, getProvider, getPublicKey, getWalletType, MAINNET, PHANTOM, ZELCORE } from "./wallet";
const web3 = require("@solana/web3.js");
import axios from 'redaxios';

export function getConnection() {
    return new web3.Connection(getUrlConnection(), 'confirmed');
}

export function getUrlConnection() {
    return getNetwork() === MAINNET ? "https://solana-api.projectserum.com" : web3.clusterApiUrl("devnet");
}

export async function getStakeAccounts() {
    const from = await getPublicKey();
    if (!from) {
        return [];
    }

    const res = await axios.get("/api/stakeAccounts", { params: { pubKey: from.toString(), network: getUrlConnection() } });
    console.log(res.data.stakeAccounts);
    return res.data.stakeAccounts;
}

async function getVoteAccount() {
    const res = await axios.get("/api/voteAccount", { params: { network: getUrlConnection(), networkId: getNetwork() } });
    console.log(res.data.voteAccount);
    return res.data.voteAccount;
}

export async function stake(balanceToStake) {
    console.log("stake");
    const connection = getConnection();

    // To delegate our stake, we get the current vote accounts and choose the first
    const voteAccount = await getVoteAccount();
    if (!voteAccount) {
        return null;
    }

    console.log(voteAccount);
    const votePubkey = new web3.PublicKey(voteAccount.votePubkey);

    const fromPublicKey = await getPublicKey();
    console.log(fromPublicKey.toString());
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
            lamports: balanceToStake * web3.LAMPORTS_PER_SOL,
            lockup: new web3.Lockup(0, 0, fromPublicKey),
            stakePubkey: stakeAccount.publicKey
        })
    );

    console.log(createAccountTransaction);
    // stakeAccount must sign the tx because it's a new account
    createAccountTransaction.partialSign(stakeAccount);

    await sendTx(createAccountTransaction);

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

export async function withdraw(pubKey, stakeBalance){
    const connection = getConnection();
    const fromPublicKey = await getPublicKey();
    const blockhashObj = await connection.getRecentBlockhash();

    // If stake account desactivated, we can withdraw funds directly
    pubKey = new web3.PublicKey(pubKey);
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
    }
    else {
        return null;
    }
};

async function sendTx(tx) {
    const connection = getConnection();
    const pubkey = await getPublicKey();
    const provider = await getProvider();
    const walletType = getWalletType();
    if (walletType === PHANTOM || walletType === ZELCORE) {
        console.log("wallet type : " + walletType);
        console.log(provider);
        const signed = await provider.signTransaction(tx);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature, 'finalized');
    }
    else {
        const h = await tx.serializeMessage();
        const r = await provider.signTransaction("44'/501'", h);
        tx.addSignature(pubkey, r.signature);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(signature, 'finalized');
    }

    console.log("done");
}