const hre = require('hardhat');

module.exports = async function main() {
  const XSeaController = await hre.ethers.getContractFactory('XSeaController');
  const XSeaController = await XSeaController.deploy();
  await XSeaController.deployed();
};
