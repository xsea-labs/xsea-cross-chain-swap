const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TEST UNISWAP POOL', () => {
  let deployer;
  let user1;
  let user2;
  let maxUint;
  let initialToken;
  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    maxUint = ethers.constants.MaxUint256;
    initialToken = 100000000;

    // Mock ERC20
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    tokenA = await MockERC20.deploy();
    tokenB = await MockERC20.deploy();
    token3 = await MockERC20.deploy();

    await tokenA.deployed();
    await tokenB.deployed();
    await token3.deployed();

    // Mock WETH
    const MockWETH = await ethers.getContractFactory('Token');
    weth = await MockWETH.deploy('MockWETH', 'WETH');

    await weth.deployed();

    // Factory
    const Factory = await ethers.getContractFactory('UniswapV2Factory');
    factory = await Factory.deploy(deployer.address);

    await factory.deployed();

    // Router
    const Router = await ethers.getContractFactory('UniswapV2Router02');
    router = await Router.deploy(factory.address, weth.address);

    await router.deployed();

    // Mint token for user
    await tokenA.mint(user1.address, initialToken);
    await tokenB.mint(user1.address, initialToken);
  });

  it('Use Case #1 : Should Create Pair', async () => {
    pairLengthBefore = await factory.allPairsLength();

    await factory.createPair(tokenA.address, tokenB.address);

    pairLengthAfter = await factory.allPairsLength();

    expect(pairLengthBefore).to.equal(0);
    expect(pairLengthAfter).to.equal(1);
  });

  it('User Case #2 : Should Get Pair Address', async () => {
    await factory.createPair(tokenA.address, tokenB.address);

    await expect(
      factory.getPair(tokenA.address, tokenB.address),
    ).to.be.not.equal('0x0000000000000000000000000000000000000000');
  });

  it('User Case #3 : Should Get Zero Address', async () => {
    await factory.createPair(tokenA.address, tokenB.address);

    expect(await factory.getPair(tokenA.address, token3.address)).to.equal(
      '0x0000000000000000000000000000000000000000',
    );
  });

  it('User Case #4 : Should Add Liquidity', async () => {
    await factory.createPair(tokenA.address, tokenB.address);
    pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    Pair = await ethers.getContractFactory('UniswapV2Pair');
    pair = await Pair.attach(pairAddress);

    reservesBefore = await pair.getReserves();

    await tokenA.connect(user1).approve(router.address, maxUint);
    await tokenB.connect(user1).approve(router.address, maxUint);

    // create pair 1:1
    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        100000,
        100000,
        100000,
        100000,
        deployer.address,
        maxUint,
      );

    reservesAfter = await pair.getReserves();

    expect(reservesBefore[0]).to.equal(0);
    expect(reservesAfter[0]).to.equal(100000);
    expect(await tokenA.balanceOf(user1.address)).to.equal(
      initialToken - 100000,
    );
    expect(await tokenB.balanceOf(user1.address)).to.equal(
      initialToken - 100000,
    );
  });

  it('User Case #5 : Should Swap A to B', async () => {
    amountIn = 1000;
    await tokenA.mint(user2.address, 10000);

    await factory.createPair(tokenA.address, tokenB.address);
    pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    Pair = await ethers.getContractFactory('UniswapV2Pair');
    pair = await Pair.attach(pairAddress);

    // approve for add liquidity and swap token
    await tokenA.connect(user1).approve(router.address, maxUint);
    await tokenB.connect(user1).approve(router.address, maxUint);

    await tokenA.connect(user2).approve(router.address, maxUint);
    await tokenB.connect(user2).approve(router.address, maxUint);

    // create pair 1:1
    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        100000,
        100000,
        100000,
        100000,
        user1.address,
        maxUint,
      );

    reserveBefore = await pair.getReserves();
    amountOutMin = await router.getAmountOut(
      amountIn,
      reserveBefore[0],
      reserveBefore[1],
    );

    // user2 swap tokenA -> tokenB
    await router
      .connect(user2)
      .swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenA.address, tokenB.address],
        user2.address,
        maxUint,
      );

    reserveAfter = await pair.getReserves();

    expect(await tokenA.balanceOf(user2.address)).to.equal('9000');
    expect(await tokenB.balanceOf(user2.address)).to.not.equal('0');
  });

  it('User Case #6 : Should Swap B to A', async () => {
    amountIn = 1000;
    await tokenB.mint(user2.address, 10000);

    await factory.createPair(tokenA.address, tokenB.address);
    pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    Pair = await ethers.getContractFactory('UniswapV2Pair');
    pair = await Pair.attach(pairAddress);

    // approve for add liquidity and swap token
    await tokenA.connect(user1).approve(router.address, maxUint);
    await tokenB.connect(user1).approve(router.address, maxUint);

    await tokenA.connect(user2).approve(router.address, maxUint);
    await tokenB.connect(user2).approve(router.address, maxUint);

    // create pair 1:1
    await router
      .connect(user1)
      .addLiquidity(
        tokenA.address,
        tokenB.address,
        100000,
        100000,
        100000,
        100000,
        user1.address,
        maxUint,
      );

    reserveBefore = await pair.getReserves();
    amountOutMin = await router.getAmountOut(
      amountIn,
      reserveBefore[0],
      reserveBefore[1],
    );

    // user2 swap tokenA -> tokenB
    await router
      .connect(user2)
      .swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenB.address, tokenA.address],
        user2.address,
        maxUint,
      );

    reserveAfter = await pair.getReserves();

    expect(await tokenA.balanceOf(user2.address)).to.not.equal('0');
    expect(await tokenB.balanceOf(user2.address)).to.equal('9000');
  });
});
