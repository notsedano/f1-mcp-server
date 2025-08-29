require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  // Switch default network to Core Testnet2 (chainId 1114)
  defaultNetwork: "core_testnet2",

  networks: {
    hardhat: {},
    core_testnet: {
      url: "https://rpc.test.btcs.network",
      accounts: [PRIVATE_KEY],
      chainId: 1115,
    },
    // Core Testnet2 (1114) — use RPC from env for flexibility
    core_testnet2: {
      url: process.env.CORE_TESTNET2_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      chainId: 1114,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
};