import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  balance: string;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  redirectToMetamaskLogin: (returnPath?: string) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<number | null>(null);
  const isRedirectedFromMetaMask = false;

  // Helper function to detect if we're in the MetaMask mobile browser
  const isMetaMaskBrowser = () => {
    return navigator.userAgent.includes('MetaMaskMobile');
  };

  // Helper function to detect mobile device
  const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  // No visibility polling
  useEffect(() => {
    return () => {};
  }, []);

  // Check if returning from a redirect on component mount
  useEffect(() => {
    // Auto-connect after MetaMask deep link (mobile in-app browser)
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const fromMetaMask = params.get('from') === 'metamask';
      if (fromMetaMask && window.ethereum && !account) {
        await connectWallet();
      } else {
        await checkIfWalletIsConnected();
      }
    })();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      updateWalletInfo(accounts[0]);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      
      const accounts = await browserProvider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        setAccount(account);
        updateWalletInfo(account);
      }
    } catch (error) {
      console.error('Error checking if wallet is connected:', error);
    }
  };

  const updateWalletInfo = async (account: string) => {
    if (!provider) return;

    // Set signer best-effort
    try {
      const nextSigner = await provider.getSigner();
      setSigner(nextSigner);
    } catch {}

    // Fetch balance with retry and optional RPC fallback
    let nextBalance = balance;
    try {
      const b = await provider.getBalance(account);
      nextBalance = ethers.formatEther(b);
    } catch {
      // Retry once after a short delay
      try {
        await new Promise((r) => setTimeout(r, 300));
        const b2 = await provider.getBalance(account);
        nextBalance = ethers.formatEther(b2);
      } catch {
        // Optional fallback via explicit RPC provider
        try {
          const url = import.meta.env.VITE_CORE_RPC_URL as string | undefined;
          const chain = Number(import.meta.env.VITE_CORE_CHAIN_ID || 1114);
          if (url) {
            const rpc = new ethers.JsonRpcProvider(url, chain);
            const b3 = await rpc.getBalance(account);
            nextBalance = ethers.formatEther(b3);
          }
        } catch {}
      }
    }
    setBalance(nextBalance);

    // Fetch network best-effort
    try {
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch {}
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this dApp!');
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateWalletInfo(accounts[0]);
        }
      } catch (requestError) {
        const accounts = await browserProvider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateWalletInfo(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance('0');
    setChainId(null);
  };

  const redirectToMetamaskLogin = async (_returnPath?: string) => {
    const isMobile = isMobileDevice();
    const isInMetaMask = isMetaMaskBrowser();
    const url = new URL(window.location.href);
    url.searchParams.set('from', 'metamask');
    if (!window.ethereum && isMobile && !isInMetaMask) {
      const metamaskDeepLink = 'https://metamask.app.link/dapp/' + url.href.replace(/^https?:\/\//, '');
      window.location.href = metamaskDeepLink;
      return;
    }
    await connectWallet();
  };

  // Try to automatically connect if user was redirected from MetaMask
  useEffect(() => {
    if (isRedirectedFromMetaMask && window.ethereum && !account) {
      connectWallet();
    }
  }, [isRedirectedFromMetaMask]);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected: !!account,
        balance,
        chainId,
        connectWallet,
        disconnectWallet,
        redirectToMetamaskLogin
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};