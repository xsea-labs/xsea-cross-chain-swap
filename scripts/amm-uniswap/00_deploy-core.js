const hre = require('hardhat');

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;

  // LP token
  const MdexLP = await hre.ethers.getContractFactory('Token');
  const mdexLP = await MdexLP.deploy('MDEX-LP', 'MDEX');
  await mdexLP.deployed();

  // Factory
  const Factory = await hre.ethers.getContractFactory('UniswapV2Factory');
  const factory = await Factory.deploy(deployer);
  await factory.deployed();

  // Router
  const Router = await hre.ethers.getContractFactory('UniswapV2Router02');
  const router = await Router.deploy(factory.address, mdexLP.address);
  await router.deployed();

  console.log('LP Token deployed to:', mdexLP.address);
  console.log('Uniswap Factory deployed to:', factory.address);
  console.log('Uniswap Router deployed to:', router.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
