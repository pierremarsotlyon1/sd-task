const web3 = require("@solana/web3.js");

const getStakeAccounts = async (req, res) => {
    const { pubKey, network } = req.query;
    if (!pubKey) {
        return [];
    }

    const connection = new web3.Connection(network, 'confirmed');
    const stakeAccounts = await connection.getProgramAccounts(new web3.PublicKey("Stake11111111111111111111111111111111111111"),
        {
            encoding: "base64",
            commitment: "confirmed",
            filters: [
                {
                    memcmp: {
                        bytes: pubKey,
                        offset: 12
                    }
                }
            ]
        });

    for (const stakeAccount of stakeAccounts) {
        const acc = await connection.getStakeActivation(stakeAccount.pubkey);
        const rent = await connection.getMinimumBalanceForRentExemption(stakeAccount.account.data.length);

        let inflation = 0;
        try {
            inflation = await connection.getInflationReward([stakeAccount.pubkey]);
        }
        catch(e) {
            console.log(e);
        }
        
        stakeAccount.rentReserve = rent / web3.LAMPORTS_PER_SOL;
        stakeAccount.activeStake = acc.active / web3.LAMPORTS_PER_SOL;
        stakeAccount.balance = stakeAccount.account.lamports / web3.LAMPORTS_PER_SOL;
        stakeAccount.rewards = inflation[0]?.amount / web3.LAMPORTS_PER_SOL || 0;
        stakeAccount.stateStake = acc.state;
        stakeAccount.pubkey = stakeAccount.pubkey.toString();
    }

	return res.json({
		stakeAccounts
	});
};

export default getStakeAccounts;