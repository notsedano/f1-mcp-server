import { ethers } from 'ethers';
import { StraightBetReceiptsAbi } from './contractAbis';

const CORE_CHAIN_ID = Number(import.meta.env.VITE_CORE_CHAIN_ID || 1114);
const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_CORE_NFT_CONTRACT_ADDRESS || '';

export async function ensureCoreTestnetNetwork(provider: ethers.BrowserProvider) {
  const net = await provider.getNetwork();
  if (Number(net.chainId) === CORE_CHAIN_ID) return;
  const request = (provider as any).provider?.request?.bind((provider as any).provider);
  if (!request) return;
  try {
    await request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + CORE_CHAIN_ID.toString(16) }] });
  } catch {
    await request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x' + CORE_CHAIN_ID.toString(16),
        chainName: 'Core Blockchain TestNet2',
        nativeCurrency: { name: 'tCORE2', symbol: 'tCORE2', decimals: 18 },
        rpcUrls: [import.meta.env.VITE_CORE_RPC_URL || 'https://rpc.test2.btcs.network'],
        blockExplorerUrls: [import.meta.env.VITE_CORE_EXPLORER_URL || 'https://scan.test2.btcs.network']
      }]
    });
  }
}

export async function mintReceiptNft(args: {
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  destinationAddress: string;
  metadataUri: string;
}): Promise<{ txHash: string; tokenId: string }>{
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('Minting not configured: VITE_CORE_NFT_CONTRACT_ADDRESS missing');
  }
  await ensureCoreTestnetNetwork(args.provider);
  const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, StraightBetReceiptsAbi, args.signer);
  const tx = await contract.mintNFT(args.destinationAddress, args.metadataUri);
  const receipt = await tx.wait();
  // Try to parse tokenId from event; fall back to return value if available
  let tokenId = '';
  try {
    const ev = receipt?.logs?.map((l: any) => {
      try { return contract.interface.parseLog(l); } catch { return null; }
    }).find((x: any) => x && x.name === 'Minted');
    if (ev) tokenId = ev.args?.tokenId?.toString();
  } catch {}
  if (!tokenId && tx) {
    try { tokenId = (await tx.wait()).hash; } catch {}
  }
  return { txHash: receipt?.hash || tx.hash, tokenId };
}


