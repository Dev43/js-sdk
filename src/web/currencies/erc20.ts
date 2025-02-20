import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { CurrencyConfig, Tx } from "../../common/types";
import { getRedstonePrice } from "../currency";
import EthereumConfig from "./ethereum";

export interface ERC20CurrencyConfig extends CurrencyConfig { contractAddress: string; }

export default class ERC20Config extends EthereumConfig {
    private contractInstance: ethers.Contract;
    private contractAddress: string;

    constructor(config: ERC20CurrencyConfig) {
        super(config);
        this.contractAddress = config.contractAddress;
    }

    async getContract(): Promise<ethers.Contract> {
        if (!this.contractInstance) {
            this.contractInstance = new ethers.Contract(this.contractAddress, erc20abi, this.w3signer);
            this.base = ["wei", Math.pow(10, await this.contractInstance.decimals())];
        }
        return this.contractInstance;
    }

    async getTx(txId: string): Promise<Tx> {
        const response = await (this.providerInstance).getTransaction(txId);
        if (!response) throw new Error("Tx doesn't exist");
        if (
            response.data.length !== 138 ||
            response.data.slice(2, 10) !== "a9059cbb" // standard ERC20-ABI method ID for transfers
        ) {
            throw new Error("Tx isn't a ERC20 transfer");
        }
        const to = `0x${response.data.slice(34, 74)}`;
        const amount = new BigNumber(response.data.slice(74), 16);

        return {
            from: response.from,
            to,
            blockHeight: response.blockNumber ? new BigNumber(response.blockNumber) : null,
            amount,
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= this.minConfirm,
        };
    }

    /**
     * Returns the fee in CONTRACT CURRENCY UNITS equivalent to the fee derived via gas currency units, i.e Wei
     * @param amount 
     * @param to 
     * @returns 
     */

    async getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber> {
        const _amount = "0x" + new BigNumber(amount).toString(16);
        const contract = await this.getContract();

        const gasPrice = await this.providerInstance.getGasPrice();
        const gasLimit = await contract.estimateGas.transfer(to, _amount);
        const units = new BigNumber(gasPrice.mul(gasLimit).toString()); // price in WEI
        const [fiatGasPrice] = await this.getGas(); // get price of gas units
        const value = fiatGasPrice.multipliedBy(units); // value of the fee
        // convert value 
        const ctPrice = new BigNumber(await this.price()); // price for this currency

        const ctAmount = (new BigNumber(value).dividedToIntegerBy(ctPrice));
        // const b = ctAmount.multipliedBy(ctPrice)
        // const c = value.dividedBy(this.base[1])
        // console.log(b);
        // console.log(c)
        return ctAmount;
    }

    async createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{ txId: string; tx: any; }> {
        // const provider = await this.getProvider()
        // const wallet = new Wallet(this.wallet, this.providerInstance);
        const contract = await this.getContract();
        const _amount = "0x" + new BigNumber(amount).toString(16);
        const tx = await contract.populateTransaction.transfer(to, _amount);
        // Needed *specifically* for ERC20
        tx.gasPrice = await this.providerInstance.getGasPrice();
        tx.gasLimit = await contract.estimateGas.transfer(to, _amount);
        tx.chainId = (await this.providerInstance.getNetwork()).chainId;
        tx.nonce = await this.providerInstance.getTransactionCount(this.address);
        // const txr = this.w3signer.populateTransaction()
        // const signedTx = await this.wallet.signTransaction(tx);
        // const txId = "0x" + keccak256(Buffer.from(signedTx.slice(2), "hex")).toString("hex");
        return { txId: undefined, tx: tx };
    }

    // TODO: create a nicer solution than just overrides (larger issue: some currencies aren't on redstone)
    public async getGas(): Promise<[BigNumber, number]> {
        return [new BigNumber(await getRedstonePrice("ETH")), 1e18];
    }


}

export const erc20abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];