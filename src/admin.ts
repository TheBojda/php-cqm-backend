import 'bootstrap';
import * as bootstrap from 'bootstrap';
import './style.scss';
import { JsonRpcProvider, Contract, BrowserProvider } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

const CONTRACT_ADDRESS = '0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D';
const RPC_URL = 'https://rpc.chiadochain.net';

class ERC20Admin {

    constructor() {
        window.onload = () => this.load();
    }

    private async load() {
        const abi = [
            "function totalSupply() public view returns (uint256)"
        ];
        const provider = new JsonRpcProvider(RPC_URL);
        const contract = new Contract(CONTRACT_ADDRESS, abi, provider);
        try {
            const totalSupply = await contract.totalSupply();
            const formattedSupply = Math.floor(parseFloat(totalSupply.toString()) / Math.pow(10, 18)).toString();
            const totalAmountElement = document.getElementById('totalAmountValue');
            if (totalAmountElement) {
                totalAmountElement.textContent = formattedSupply.toString();
            }
        } catch (error) {
            console.error('Error fetching total supply:', error);
        }

        const mintButton = document.getElementById('mintButton');
        const burnButton = document.getElementById('burnButton');

        if (mintButton) {
            mintButton.addEventListener('click', async () => {
                try {
                    await this.mint();
                } catch (error) {
                    console.error('Error during minting:', error);
                }
            });
        }

        if (burnButton) {
            burnButton.addEventListener('click', async () => {
                try {
                    await this.burn();
                } catch (error) {
                    console.error('Error during burning:', error);
                }
            });
        }
    }

    private async mint() {
        const provider = await detectEthereumProvider();
        if (!provider) {
            alert('Please install MetaMask!');
            return;
        }

        const abi = [
            "function mint(address to, uint256 amount)"
        ];

        const browserProvider = new BrowserProvider(provider as any);
        const signer = await browserProvider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, abi, signer);

        try {
            const amountInput = document.getElementById('mintAmount') as HTMLInputElement;
            const amount = BigInt(amountInput.value) * BigInt(10 ** 18);
            const tx = await contract.mint(signer.address, amount);
            await tx.wait();
            alert('Minting successful!');
            window.location.reload();
        } catch (error) {
            console.error('Error during minting:', error);
            alert('Minting failed. Check console for details.');
        }
    }

    private async burn() {
        const provider = await detectEthereumProvider();
        if (!provider) {
            alert('Please install MetaMask!');
            return;
        }

        const abi = [
            "function burn(uint256 value)"
        ];

        const browserProvider = new BrowserProvider(provider as any);
        const signer = await browserProvider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, abi, signer);

        try {
            const amountInput = document.getElementById('burnAmount') as HTMLInputElement;
            const amount = BigInt(amountInput.value) * BigInt(10 ** 18);
            const tx = await contract.burn(amount);
            await tx.wait();
            alert('Burning successful!');
            window.location.reload();
        } catch (error) {
            console.error('Error during minting:', error);
            alert('Burning failed. Check console for details.');
        }
    }

}

new ERC20Admin();