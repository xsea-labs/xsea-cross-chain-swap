const hre = require("hardhat");

const A = 10;
const FEE = 4000000;
const DEPLOYER = "0x2BA9a6C68D39EFEc15C2c048124B4f6dAac5d6fd";
const DECIMAL = 18;
const RATEINFO = "0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000";
const MAXUINT = hre.ethers.constants.MaxUint256;

const deployCurveToken = async () => {
  const CurveToken = await hre.ethers.getContractFactory("CurveToken");
  const curveToken = await CurveToken.deploy("MDEX-LP", "LP-TOKEN");
  await curveToken.deployed();

  console.log("Deploy curve token success: ", curveToken.address);

  return curveToken.address;
}

const deployPool = async (token1Address, token2Address, curveTokenAddress) => {
  const Pool = await hre.ethers.getContractFactory("Pool2Assets");
  const pool = await Pool.deploy(
    DEPLOYER, [token1Address, token2Address], curveTokenAddress, A, FEE);
  await pool.deployed();

  console.log("Deploy pool success: ", pool.address);

  return pool.address;
}

const registerPool = async (
  registryAddress, poolAddress, curveTokenAddress, token1Name, token2Name) => {
    
  const poolName = `Pool ${token1Name}-${token2Name}`;
  
  const Registry = await hre.ethers.getContractFactory("Registry");
  const registry = Registry.attach(registryAddress);
  await registry.add_pool_without_underlying(
    poolAddress, 2, curveTokenAddress, RATEINFO, DECIMAL, DECIMAL, false, false, poolName);
  
  console.log("Register pool success");
};

const prepareLiquidityPool = async (
  poolAddress, token1Address, token2Address, curveTokenAddress) => {
  
  const mintAmount = "2000000000000000000000000";
  
  const accounts = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory('Token');
  const token1 = Token.attach(token1Address);
  const token2 = Token.attach(token2Address);

  await token1.mint(DEPLOYER, mintAmount);
  await token2.mint(DEPLOYER, mintAmount);
  console.log('Mint token to deployer success');

  const CurveToken = await ethers.getContractFactory('CurveToken');
  const curveToken = CurveToken.attach(curveTokenAddress);
  await curveToken.connect(accounts[0]).set_minter(poolAddress);

  await token1.approve(poolAddress, MAXUINT);
  await token2.approve(poolAddress, MAXUINT);
  console.log('Approve token success');
};

const addLiquidityPool = async (poolAddress) => {
  const tokenAmount = "2000000000000000000000000";
  const mintLPMinAmount = 0;

  const Pool = await hre.ethers.getContractFactory('Pool2Assets');
  const pool = Pool.attach(poolAddress);
  await pool.add_liquidity([tokenAmount, tokenAmount], mintLPMinAmount);
  console.log('Add liquidity to pool sucess');
};

const deployCurvePool = async (registryAddress, token1, token2) => {
  const curveTokenAddress = deployCurveToken();
  const poolAddress = deployPool(token1.address, token2.address, curveTokenAddress);

  await registerPool(registryAddress, poolAddress, curveTokenAddress, token1.name, token2.name);
  await prepareLiquidityPool(poolAddress, token1.address, token2.address, curveTokenAddress);
  await addLiquidityPool(poolAddress);
}

module.exports = {
  deployCurvePool
}