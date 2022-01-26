const web3 = require("@solana/web3.js");
const MAINNET = 1;

const getVoteAccount = async (req, res) => {
    const { network, networkId } = req.query;
    const connection = new web3.Connection(network, 'confirmed');
    const voteAccounts = await connection.getVoteAccounts();
    let voteAccount;
    if (parseInt(networkId) === MAINNET) {
        // We select the StakeDAO validator
        for (const v of voteAccounts.current) {
            if (v.votePubkey === process.env.solanaValidator) {
                voteAccount = v;
                break;
            }
        }
    }
    else {
        voteAccount = voteAccounts.current[0];
    }

	return res.json({
		voteAccount
	});
};

export default getVoteAccount;