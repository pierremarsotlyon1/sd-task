import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { xSDT_ABI, XSDT_ETH_BOND } from "../tools/abis";
import { getAdjustment, getMaxBondSize, getSDTPrice, loadByContract } from "../tools/tokensUtils";
import { WalletNotConnected } from "./WalletNotConnected";

export const TresoryBonds = () => {
    const { active, account, library } = useWeb3React();
    const [dto, setDto] = useState(null);

    useEffect(() => {

        async function run() {
            if (!active || dto !== null) {
                return;
            }

            const xSDT_treasury = await loadByContract(library, xSDT_ABI, "0xac14864ce5a98af3248ffbf549441b04421247d3", "0x3F60E5F9437b79EA30135eB75d3A907944eeF303");
            const myXSDT = await loadByContract(library, xSDT_ABI, "0xac14864ce5a98af3248ffbf549441b04421247d3", account);
            const marketSdtPrice = await getSDTPrice();
            const maxBondSize = await getMaxBondSize(library, XSDT_ETH_BOND, "0x903dE5B04B9878696FfA08bD300Cc06b260fc5C9");
            const roi = await getAdjustment(library, XSDT_ETH_BOND, "0x903dE5B04B9878696FfA08bD300Cc06b260fc5C9");
            setDto({
                xSDT_treasury,
                myXSDT,
                marketSdtPrice,
                maxBondSize,
                roi
            });
        };
        run();
    });

    if (!active || dto === null) {
        return <WalletNotConnected />;
    } else {
        const worthIt = dto.xSDT_treasury > dto.maxBondSize && dto.roi > 5;

        return (
            <>
            <div className="flex flex-col items-center justify-center mt-8">
                <p>xSDT into OHM treasury contract : {dto.xSDT_treasury}</p>
                <p>My xSDT : {dto.myXSDT}</p>
                <p>Max bond size : {dto.maxBondSize} xSDT / {dto.maxBondSize*1.198} SDT</p>
                <p>Market SDT price : ${dto.marketSdtPrice}</p>
                <p>Market xSDT price : ${dto.marketSdtPrice * 1.198}</p>
                <p>Bond ROI : {dto.roi}%</p>
            </div>
            <div className="flex flex-col items-center justify-center mt-8">
                <p>Worth it : {worthIt ? "Yes" : "No"}</p>
            </div>
            </>
        )
    }
};