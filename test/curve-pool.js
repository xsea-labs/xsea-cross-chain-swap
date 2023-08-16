const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TEST CURVE POOL', () => {
  let deployer;
  let provider;
  let registry;
  let poolInfo;
  let curveToken;
  let token1;
  let token2;
  let pool2;
  let user1;
  let totalSupply;
  let decimal;
  beforeEach(async () => {
    [deployer, user1] = await ethers.getSigners();

    decimal = 18;
    totalSupply = '10000000000000000000000';
    rateInfo =
      '0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000';

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    token1 = await MockERC20.deploy();
    token2 = await MockERC20.deploy();
    token3 = await MockERC20.deploy();

    await token1.deployed();
    await token2.deployed();
    await token3.deployed();

    const AddressProvider = await ethers.getContractFactory('AddressProvider');

    provider = await AddressProvider.deploy(deployer.address);
    await provider.deployed();

    const Registry = await ethers.getContractFactory('Registry');
    registry = await Registry.deploy(provider.address);
    await registry.deployed();

    const PoolInfo = await ethers.getContractFactory('MdexCurveFiPool');
    poolInfo = await PoolInfo.deploy(provider.address);
    await poolInfo.deployed();

    await provider.set_address(0, registry.address);
    await provider.add_new_id(poolInfo.address, 'MdexCurveFiPool Getters');

    const CurveToken = await ethers.getContractFactory('CurveToken');
    curveToken = await CurveToken.deploy('MTOKEN', 'MTK');
    await curveToken.deployed();

    const Pool = await ethers.getContractFactory('Pool2Assets');
    pool1 = await Pool.deploy(
      deployer.address,
      [token1.address, token2.address],
      curveToken.address,
      400000,
      1,
    );
    pool2 = await Pool.deploy(
      deployer.address,
      [token1.address, token3.address],
      curveToken.address,
      400000,
      1,
    );

    await pool1.deployed();
    await pool2.deployed();
  });

  it('Use Case #1 : Should Add Liquidity', async () => {
    liquidity1 = 10000;
    liquidity2 = 20000;

    await token1.mint(user1.address, totalSupply);
    await token2.mint(user1.address, totalSupply);
    await curveToken.connect(deployer).set_minter(pool1.address);

    await token1.connect(user1).approve(pool1.address, totalSupply);
    await token2.connect(user1).approve(pool1.address, totalSupply);

    await expect(
      pool1.connect(user1).add_liquidity([liquidity1, liquidity2], 0),
    )
      .to.emit(curveToken, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        user1.address,
        liquidity1 + liquidity2 - 1,
      );
  });

  it('Use Case #2 : Should Add Pool', async () => {
    n_coin = 2;
    poolName = 'Pool2AB';

    poolCountBefore = await poolInfo.get_pool_count();

    await registry.add_pool_without_underlying(
      pool1.address,
      n_coin,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      poolName,
    );

    poolCountAfter = await poolInfo.get_pool_count();
    poolRegistered = await registry.pool_list(0);

    expect(poolCountBefore, 0);
    expect(poolCountAfter, 1);
    expect(poolRegistered, pool1.address);
  });

  it('User Case #3 : Should Get Pool By Address', async () => {
    n_coin = 2;
    poolName = 'Pool2AB';

    await registry.add_pool_without_underlying(
      pool1.address,
      n_coin,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      poolName,
    );

    data = await poolInfo.get_pool_by_address(pool1.address);
    count = await poolInfo.get_pool_count();

    expect(count, 1);
    expect(data.name, poolName);
    expect(data.lp_token, curveToken.address);
    expect(data.coins.length, 2);
  });

  it('User Case #4 : Should Get Pool List', async () => {
    // Pool 1
    await registry.add_pool_without_underlying(
      pool1.address,
      2,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      'Pool2AB',
    );

    // Pool 2
    await registry.add_pool_without_underlying(
      pool2.address,
      2,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      'Pool2AC',
    );

    poolList = [];
    count = await poolInfo.get_pool_count();

    for (i = 0; i < count; i++) {
      poolAddress = await registry.pool_list(i);
      poolData = await poolInfo.get_pool_by_address(poolAddress);
      poolList.push(poolData);
    }

    expect(poolList.length, 2);
    expect(poolList[0].address, pool1.address);
    expect(poolList[1].address, pool2.address);
  });

  it('Use Case #5 : Should Get Pool Coins', async () => {
    await registry.add_pool_without_underlying(
      pool1.address,
      2,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      'Pool2AB',
    );

    poolCoins = await poolInfo.get_pool_coins(pool1.address);

    expect(poolCoins.length, 2);
    expect(poolCoins, [token1.address, token2.address]);
  });

  it('Use Case #6 : Should Swap', async () => {
    liquidity1 = 10000;
    liquidity2 = 20000;
    swapAmount = 10;

    await token1.mint(user1.address, totalSupply);
    await token2.mint(user1.address, totalSupply);
    await curveToken.connect(deployer).set_minter(pool1.address);

    await token1.connect(user1).approve(pool1.address, totalSupply);
    await token2.connect(user1).approve(pool1.address, totalSupply);

    await pool1.connect(user1).add_liquidity([liquidity1, liquidity1], 0);

    min_dy = await pool1.connect(user1).get_dy(0, 1, swapAmount);

    await expect(
      pool1.connect(user1).exchange(0, 1, 10, min_dy, user1.address),
    ).to.emit(pool1, 'TokenExchange');
  });

  it('Use Case #7 : Get Virtual Price', async () => {
    liquidity1 = 10000;
    liquidity2 = 20000;

    await token1.mint(user1.address, totalSupply);
    await token2.mint(user1.address, totalSupply);
    await curveToken.connect(deployer).set_minter(pool1.address);

    await token1.connect(user1).approve(pool1.address, totalSupply);
    await token2.connect(user1).approve(pool1.address, totalSupply);

    await pool1.connect(user1).add_liquidity([liquidity1, liquidity2], 0);

    await expect(pool1.connect(user1).get_virtual_price()).to.not.equal(0);
  });

  it('Use Case #8 : Find pool by coins', async () => {
    let n_coin = 2;
    let poolName = 'Pool2AB';

    let token1Address;
    let token2Address;

    await registry.add_pool_without_underlying(
      pool1.address,
      n_coin,
      curveToken.address,
      rateInfo,
      decimal,
      decimal,
      false,
      false,
      poolName,
    );

    let count = await poolInfo.get_pool_count();

    for (i = 0; i < count; i++) {
      poolAddress = await registry.pool_list(i);
      poolData = await poolInfo.get_pool_by_address(poolAddress);

      poolCoins = poolData.coins;

      if (
        poolCoins.includes(token1.address) &&
        poolCoins.includes(token2.address)
      ) {
        token1Address = poolCoins[0];
        token2Address = poolCoins[1];
      }
    }

    expect(token1.address, token1Address);
    expect(token2.address, token2Address);
  });
});
