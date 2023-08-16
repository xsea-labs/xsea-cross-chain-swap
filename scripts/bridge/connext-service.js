const hre = require('hardhat');

module.exports = async function main() {
  // Deploy Token
  const ConnextService = await hre.ethers.getContractFactory('ConnextService');
  const connextService = await ConnextService.deploy(
    '0x6c9a905Ab3f4495E2b47f5cA131ab71281E0546e',
    '0xD7DAE26f3C54CEE823a02C6fD25d4301860F2B33',
    '0x98bc0964247a367BDE859aD584F934e439B5D3ab',
  );

  await connextService.deployed();
};
