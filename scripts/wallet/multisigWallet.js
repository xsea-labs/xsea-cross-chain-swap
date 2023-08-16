const hre = require('hardhat');

module.exports = async function main() {
  const MultiSigWallet = await hre.ethers.getContractFactory('MultiSigWallet');
  const multiSigWallet = await MultiSigWallet.deploy([
    '0xe507a517934d0f88663d242a580b5ac548a63786',
    '0x23abb459fc3ae05b52f482abb2d2d9d7c9e33d28',
    '0xe9d2e454968379426bb6b0a92ffaf20a60ff579d',
    '0xa9aab3581a3986e38e84643793fce205677bd19d',
    '0x2ba9a6c68d39efec15c2c048124b4f6daac5d6fd',
    '0x586f45ef74679373efafcef08f7035fb699f40dd',
    '0x56e1175b24b440c57ea6677a50bff4bc461ff60f',
  ]);

  await multiSigWallet.deployed();
};
