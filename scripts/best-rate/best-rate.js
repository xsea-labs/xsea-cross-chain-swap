const hre = require('hardhat');

module.exports = async function main() {
  const XSeaBestRateQuery = await hre.ethers.getContractFactory(
    'XSeaBestRateQuery',
  );
  const XSeaBestRateQuery = await XSeaBestRateQuery.deploy();

  await XSeaBestRateQuery.deployed();
};
