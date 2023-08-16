const hre = require('hardhat');
require('dotenv').config();

module.exports = async function main() {
  const XSeaUniSwapService = await hre.ethers.getContractFactory(
    'XSeaUniSwapService',
  );
  const XSeaUniSwapService = await XSeaUniSwapService.deploy(
    '0xe2e0DfA2dC80d847F6B6B9D67FE0fDa07B10EE5a',
  );

  await XSeaUniSwapService.deployed();
};
