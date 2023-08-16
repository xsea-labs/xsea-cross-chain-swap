const hre = require('hardhat');

module.exports = async function main() {
  // Deploy Token
  const XseaCrossChainSwap = await hre.ethers.getContractFactory(
    'XseaCrossChainSwap',
  );
  const XseaCrossChainSwap = await XseaCrossChainSwap.deploy();

  await XseaCrossChainSwap.deployed();
};
