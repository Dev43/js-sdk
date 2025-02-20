import BaseCurrency from "../currency";
// import AlgorandConfig from "./algorand";
import EthereumConfig from "./ethereum";
import NearConfig from "./near";
import SolanaConfig from "./solana";
import ERC20Config from "./erc20";
import axios from "axios";
import utils from "../../common/utils";
import AptosConfig from "./aptos";

export default function getCurrency(currency: string, wallet: any, providerUrl?: string, contractAddress?: string): BaseCurrency {
    switch (currency) {
        case "ethereum":
            return new EthereumConfig({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl ?? "https://cloudflare-eth.com/", wallet });
        case "matic":
            return new EthereumConfig({ name: "matic", ticker: "MATIC", providerUrl: providerUrl ?? "https://polygon-rpc.com", wallet, minConfirm: 1 });
        case "arbitrum":
            return new EthereumConfig({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl ?? "https://arb1.arbitrum.io/rpc", wallet });
        case "bnb":
            return new EthereumConfig({ name: "bnb", ticker: "BNB", providerUrl: providerUrl ?? "https://bsc-dataseed.binance.org", wallet });
        case "avalanche":
            return new EthereumConfig({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl ?? "https://api.avax.network/ext/bc/C/rpc", wallet });
        case "boba-eth":
            return new EthereumConfig({ name: "boba-eth", ticker: "ETH", providerUrl: providerUrl ?? "https://mainnet.boba.network/", minConfirm: 1, wallet });
        case "boba": {
            const k = new ERC20Config({ name: "boba", ticker: "BOBA", providerUrl: providerUrl ?? "https://mainnet.boba.network/", contractAddress: contractAddress ?? "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", minConfirm: 1, wallet });
            // for L1 mainnet: "https://main-light.eth.linkpool.io/" and "0x42bbfa2e77757c645eeaad1655e0911a7553efbc"
            k.price = async (): Promise<number> => {
                const res = await axios.post("https://api.livecoinwatch.com/coins/single", JSON.stringify({ "currency": "USD", "code": `${k.ticker}` }), { headers: { "x-api-key": "75a7a824-6577-45e6-ad86-511d590c7cc8", "content-type": "application/json" } });
                await utils.checkAndThrow(res, "Getting price data");
                if (!res?.data?.rate) {
                    throw new Error(`unable to get price for ${k.name}`);
                }
                return +res.data.rate;
            };
            return k;
        }

        case "solana":
            return new SolanaConfig({ name: "solana", ticker: "SOL", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet });
        // case "algorand":
        //     return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        case "near":
            return new NearConfig({ name: "near", ticker: "NEAR", providerUrl: providerUrl ?? "https://rpc.mainnet.near.org", wallet });
        case "aptos":
            return new AptosConfig({ name: "aptos", ticker: "APTOS", providerUrl: providerUrl ?? "https://fullnode.mainnet.aptoslabs.com/v1", wallet });
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}


