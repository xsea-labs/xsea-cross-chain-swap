const hre = require('hardhat');

module.exports = async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;

  // Deploy Token
  const Token = await hre.ethers.getContractFactory('Token');
  const token = await Token.deploy('Latte', 'LAT');

  await token.mint(deployer, '10000000000000000000000000');
};
