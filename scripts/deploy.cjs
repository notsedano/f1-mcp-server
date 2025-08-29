/* eslint-disable no-console */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("StraightBetReceipts");
  const contract = await Factory.deploy("AgentDD Bet Receipts", "ADDBET");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("StraightBetReceipts deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


