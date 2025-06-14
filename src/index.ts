import 'bootstrap';
import './style.scss';
import { JsonRpcProvider, Contract, BrowserProvider } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

const CONTRACT_ADDRESS = '0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D';
const RPC_URL = 'https://rpc.chiadochain.net';
const chainId = '0x27d8'; // Chiado chain ID

const BACKEND_URL = 'http://localhost:8000/backend.php';

const eip712domain_type_definition = {
    "EIP712Domain": [
        {
            "name": "name",
            "type": "string"
        },
        {
            "name": "version",
            "type": "string"
        },
        {
            "name": "chainId",
            "type": "uint256"
        },
        {
            "name": "verifyingContract",
            "type": "address"
        }
    ]
}

const TransferTypes = {
    "Transfer": [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ]
}

class ERC20Main {

    constructor() {
        window.onload = () => this.load();
    }

    private async load() {
        const provider = await detectEthereumProvider();
        if (!provider) {
            alert('Please install MetaMask!');
            return;
        }

        const accounts = await (provider as any).request({
            method: 'eth_requestAccounts'
        });

        const abi = [
            " function balanceOf(address account) public view returns (uint256)"
        ];
        const ethersProvider = new JsonRpcProvider(RPC_URL);
        const contract = new Contract(CONTRACT_ADDRESS, abi, ethersProvider);
        try {
            const balance = await contract.balanceOf(accounts[0]);
            const formattedBalance = Math.floor(parseFloat(balance.toString()) / Math.pow(10, 18)).toString();
            const totalAmountElement = document.getElementById('totalAmountValue');
            if (totalAmountElement) {
                totalAmountElement.textContent = formattedBalance.toString();
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }

        const payBackButton = document.getElementById('paybackButton');
        if (payBackButton) {
            payBackButton.addEventListener('click', async () => {
                await this.payBack();
            });
        }
    }

    private splitSignature(signature: string): { r: string; s: string; v: number } {
        if (signature.startsWith("0x")) signature = signature.slice(2);
        if (signature.length !== 130) throw new Error("Invalid signature length");

        const r = "0x" + signature.slice(0, 64);
        const s = "0x" + signature.slice(64, 128);
        let v = parseInt(signature.slice(128, 130), 16);

        // Normalize v (some sources use 0/1 instead of 27/28)
        if (v < 27) v += 27;

        return { r, s, v };
    }

    private async payBack() {
        const provider = await detectEthereumProvider();
        if (!provider) {
            alert('Please install MetaMask!');
            return;
        }

        const accounts = await (provider as any).request({
            method: 'eth_requestAccounts'
        });

        const ethersProvider = new JsonRpcProvider(RPC_URL);
        const abi = [
            "function nonces(address owner) view returns (uint256)",
            "function owner() public view returns (address)"
        ];
        const contract = new Contract(CONTRACT_ADDRESS, abi, ethersProvider);
        const owner = await contract.owner();
        const nonce = await contract.nonces(accounts[0]);
        const block = await ethersProvider.getBlock('latest');
        if (!block) {
            throw new Error('Failed to fetch the latest block.');
        }
        const currentTimestamp = block.timestamp;
        const deadline = currentTimestamp + 86400; // Add 1 day (86400 seconds)

        const amountInput = document.getElementById('paybackAmount') as HTMLInputElement;
        const amount = BigInt(amountInput.value) * BigInt(10 ** 18);

        const domain = {
            name: 'CQMToken',
            version: '1',
            chainId,
            verifyingContract: CONTRACT_ADDRESS
        };

        const message = {
            from: accounts[0].toString(),
            to: owner.toString(),
            amount: amount.toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString()
        }

        const metamask_request = {
            "types": {
                ...eip712domain_type_definition,
                ...TransferTypes
            },
            "primaryType": "Transfer",
            domain,
            message
        }

        let signature = await (provider as any).request({
            "method": "eth_signTypedData_v4",
            "params": [
                accounts[0],
                JSON.stringify(metamask_request)
            ]
        })

        const { r, s, v } = this.splitSignature(signature);
        const payload = {
            from: message.from,
            amount: message.amount,
            deadline: message.deadline,
            v,
            r,
            s
        };

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Transaction submitted successfully: ' + JSON.stringify(result));
            } else {
                const errorText = await response.text();
                alert('Error submitting transaction: ' + errorText);
            }
        } catch (error) {
            console.error('Error posting to backend:', error);
            alert('Error posting to backend: ' + error.message);
        }
    }
}

new ERC20Main();