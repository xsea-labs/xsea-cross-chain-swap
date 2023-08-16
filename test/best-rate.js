const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TEST BEST RATE', () => {
  let deployer;
  let provider;
  let registry;
  let poolInfo;
  let curveToken;
  let tokenA;
  let tokenB;
  let pool;
  let XSeaController;
  let XSeaCurveService;
  let XSeaUniSwapService;
  let user1;
  let user2;
  let user3;
  let user4;
  let user5;
  let XSeaBestRateQuery;
  let factory;
  let weth;
  let stableCoin;
  let router;
  let multiSigWallet;
  let rateInfo =
    '0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000';

  beforeEach(async () => {
    [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();

    const maxUint = ethers.constants.MaxUint256;
    const n_coin = 2;
    const poolName = 'Pool2AB';

    // Mock ERC20
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    tokenA = await MockERC20.deploy();
    tokenB = await MockERC20.deploy();
    stableCoin = await MockERC20.deploy();

    await tokenA.deployed();
    await tokenB.deployed();

    await tokenA.mint(user1.address, '600000000000000000000000');
    await tokenB.mint(user1.address, '600000000000000000000000');

    // Mock WETH
    const MockWETH = await ethers.getContractFactory('Token');
    weth = await MockWETH.deploy('MockWETH', 'WETH');

    await weth.deployed();

    //Provider
    const AddressProvider = await ethers.getContractFactory('AddressProvider');
    provider = await AddressProvider.deploy(deployer.address);
    await provider.deployed();

    //Registry
    const Registry = await ethers.getContractFactory('Registry');
    registry = await Registry.deploy(provider.address);
    await registry.deployed();

    //PoolInfo
    const PoolInfo = await ethers.getContractFactory('MdexCurveFiPool');
    poolInfo = await PoolInfo.deploy(provider.address);
    await poolInfo.deployed();

    await provider.set_address(0, registry.address);
    await provider.add_new_id(poolInfo.address, 'MdexCurveFiPool Getters');

    // Deploy Curve Token
    const CurveToken = await ethers.getContractFactory('CurveToken');
    curveToken = await CurveToken.deploy('MTOKEN', 'MTK');
    await curveToken.deployed();

    // Deploy Pool2Assets
    const Pool2Assets = await ethers.getContractFactory('Pool2Assets');
    pool = await Pool2Assets.deploy(
      deployer.address,
      [tokenA.address, tokenB.address],
      curveToken.address,
      400000,
      1,
    );

    await pool.deployed();

    //Add liquidity to Curve

    await tokenA.connect(user1).approve(pool.address, maxUint);
    await tokenB.connect(user1).approve(pool.address, maxUint);

    await curveToken.connect(deployer).set_minter(pool.address);

    await pool
      .connect(user1)
      .add_liquidity(
        ['100000000000000000000000', '100000000000000000000000'],
        0,
      );

    await registry
      .connect(user1)
      .add_pool_without_underlying(
        pool.address,
        n_coin,
        curveToken.address,
        rateInfo,
        18,
        18,
        false,
        false,
        poolName,
      );

    // Factory
    const Factory = await ethers.getContractFactory('UniswapV2Factory');
    factory = await Factory.deploy(deployer.address);

    await factory.deployed();

    // Router
    const Router = await ethers.getContractFactory('UniswapV2Router02');
    router = await Router.deploy(factory.address, weth.address);

    await router.deployed();

    // Create Pair
    await factory.createPair(tokenA.address, tokenB.address);

    // Add Liquidity
    await tokenA.connect(user1).approve(router.address, maxUint);
    await tokenB.connect(user1).approve(router.address, maxUint);

    // Create pair 1:1
    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        '100000000000000000000000',
        '100000000000000000000000',
        '100000000000000000000000',
        '100000000000000000000000',
        deployer.address,
        maxUint,
      );

    // Deploy Multisig Wallet

    const MultiSigWallet = await ethers.getContractFactory('MultiSigWallet');
    multiSigWallet = await MultiSigWallet.deploy(
      [
        user1.address,
        user2.address,
        user3.address,
        user4.address,
        user5.address,
      ],
      stableCoin.address,
    );

    const XSeaController = await ethers.getContractFactory('XSeaController');
    XSeaController = await XSeaController.deploy(multiSigWallet.address);

    // Deploy Uniswap Service
    const XSeaUniSwapService = await ethers.getContractFactory(
      'XSeaUniSwapService',
    );

    // Deploy Curve Service
    const XSeaCurveService = await ethers.getContractFactory(
      'XSeaCurveService',
    );

    await XSeaController.deployed();

    XSeaUniSwapService = await XSeaUniSwapService.deploy(
      XSeaController.address,
      router.address,
      factory.address,
    );

    XSeaCurveService = await XSeaCurveService.deploy(
      XSeaController.address,
      registry.address,
    );

    await XSeaUniSwapService.deployed();
    await XSeaCurveService.deployed();

    await XSeaController.addTradingRoute(
      'UniSwapService',
      XSeaUniSwapService.address,
    );

    await XSeaController.addTradingRoute(
      'CurveSwapService',
      XSeaCurveService.address,
    );

    const XSeaBestRateQuery = await ethers.getContractFactory(
      'XSeaBestRateQuery',
    );
    XSeaBestRateQuery = await XSeaBestRateQuery.deploy(XSeaController.address);

    await XSeaBestRateQuery.deployed();
  });

  it('Use Case #1 : Should selected best rate', async () => {
    const data = await XSeaBestRateQuery.oneRoute(
      tokenA.address,
      tokenB.address,
      '100000000000000000000000',
      [0, 1],
    );

    await expect(data[0]).to.equal('1');
  });

  it('Use Case #2 : Should should spilt swap', async () => {
    const data = await XSeaBestRateQuery.splitTwoRoutes(
      tokenA.address,
      tokenB.address,
      '300000000000000000000000',
      [0, 1],
      5,
    );
  });
});
