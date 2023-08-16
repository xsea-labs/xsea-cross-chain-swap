const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TEST SWAP TOKEN UNISWAP', () => {
  let deployer;
  let user1;
  let user2;
  let user3;
  let user4;
  let user5;
  let factory;
  let router;
  let tokenA;
  let tokenB;
  let weth;
  let stableCoin;
  let multiSigWallet;
  let XSeaController;
  let XSeaUniSwapService;
  beforeEach(async () => {
    [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();

    maxUint = ethers.constants.MaxUint256;

    // Mock ERC20
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    tokenA = await MockERC20.deploy();
    tokenB = await MockERC20.deploy();
    stableCoin = await MockERC20.deploy();

    await tokenA.deployed();
    await tokenB.deployed();
    await stableCoin.deployed();

    // Mock WETH
    const MockWETH = await ethers.getContractFactory('Token');
    weth = await MockWETH.deploy('MockWETH', 'WETH');

    await weth.deployed();

    const Factory = await ethers.getContractFactory('UniswapV2Factory');
    factory = await Factory.deploy(deployer.address);

    await factory.deployed();

    // Router
    const Router = await ethers.getContractFactory('UniswapV2Router02');
    router = await Router.deploy(factory.address, weth.address);

    await router.deployed();

    // Mint token for user
    await tokenA.mint(user1.address, '500000000000000000000000');
    await tokenB.mint(user1.address, '500000000000000000000000');
    await stableCoin.mint(user1.address, '500000000000000000000000');

    // Create Pair
    await factory.createPair(tokenA.address, tokenB.address);
    await factory.createPair(tokenA.address, stableCoin.address);

    // Add Liquidity
    await tokenA.connect(user1).approve(router.address, maxUint);
    await tokenB.connect(user1).approve(router.address, maxUint);
    await stableCoin.connect(user1).approve(router.address, maxUint);

    // Create pair 1:1
    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        '200000000000000000000000',
        '200000000000000000000000',
        0,
        1,
        deployer.address,
        maxUint,
      );

    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        stableCoin.address,
        '100000000000000000000000',
        '100000000000000000000000',
        0,
        1,
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

    await XSeaController.deployed();

    XSeaUniSwapService = await XSeaUniSwapService.deploy(
      XSeaController.address,
      router.address,
      factory.address,
    );

    await XSeaUniSwapService.deployed();

    await XSeaController.setStableCoin(stableCoin.address);

    await XSeaController.addTradingRoute(
      'UniSwapService',
      XSeaUniSwapService.address,
    );
  });

  it('Use Case #1 : Should Swap Token', async () => {
    await tokenA
      .connect(user1)
      .approve(XSeaController.address, '100000000000000000000000');

    await XSeaController.connect(user1).swap(
      tokenA.address,
      tokenB.address,
      '100000000000000000000000',
      0,
    );

    await expect(await tokenA.balanceOf(user1.address)).to.equal(
      '100000000000000000000000',
    );
    await expect(await tokenB.balanceOf(user1.address)).to.gt('0');
    await expect(await stableCoin.balanceOf(multiSigWallet.address)).to.gt('0');
  });
  it('Use Case #2 : Should Spilt Swap Token', async () => {
    await tokenA
      .connect(user1)
      .approve(XSeaController.address, '100000000000000000000000');

    await XSeaController.connect(user1).spiltSwap(
      tokenA.address,
      tokenB.address,
      '100000000000000000000000',
      [0, 0],
      ['40000000000000000000000', '40000000000000000000000'],
    );

    await expect(await tokenA.balanceOf(user1.address)).to.equal(
      '100000000000000000000000',
    );
    await expect(await tokenB.balanceOf(user1.address)).to.gt('0');
    await expect(await stableCoin.balanceOf(multiSigWallet.address)).to.gt('0');
  });
  it("Use Case #3 : Shouldn't call service if not controller", async () => {
    await tokenA
      .connect(user1)
      .approve(XSeaController.address, '10000000000000000000000');

    await expect(
      XSeaUniSwapService.connect(user1).swap(
        tokenA.address,
        tokenB.address,
        '10000000000000000000000',
        user1.address,
      ),
    ).to.revertedWith('Not Controller');
  });

  it("Use Case #4 : Shouldn't swap token when contract is pausing", async () => {
    await XSeaController.setPause();

    await tokenA
      .connect(user1)
      .approve(XSeaController.address, '10000000000000000000000');

    await expect(
      XSeaController.connect(user1).swap(
        tokenA.address,
        tokenB.address,
        '10000000000000000000000',
        0,
      ),
    ).to.revertedWith('Pausable: paused');
  });

  it("Use Case #5 : Shouldn't swap token when router is disabled", async () => {
    await XSeaController.disableTradingRoute(0);

    await tokenA
      .connect(user1)
      .approve(XSeaController.address, '10000000000000000000000');

    await expect(
      XSeaController.connect(user1).swap(
        tokenA.address,
        tokenB.address,
        '10000000000000000000000',
        0,
      ),
    ).to.revertedWith('This trading route is disabled');
  });
});
