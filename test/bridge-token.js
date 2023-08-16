const { ethers } = require('hardhat');
const { expect } = require('chai');
const { ethers: etherJS } = require('ethers');
const {
  MOCK_TOKEN,
  CHAIN_1,
  CHAIN_2,
  CHAIN_DOMAIN_1,
  CHAIN_DOMAIN_2,
} = require('../lib/constant');

describe('TEST BRIDGE TOKEN', () => {
  let connextBridgeToken1;
  let connextBridgeToken2;
  let mockExecutor;
  let mockConnextHandler;
  let user1;
  beforeEach(async () => {
    [user1] = await ethers.getSigners();
    const MockConnextHandler = await ethers.getContractFactory(
      'MockConnextHandler',
    );
    const MockExecutor = await ethers.getContractFactory('MockExecutor');
    mockExecutor = await MockExecutor.deploy();

    mockConnextHandler = await MockConnextHandler.deploy();
    await mockConnextHandler.setExecutor(mockExecutor.address);

    const ConnextBridgeToken = await ethers.getContractFactory(
      'ConnextBridgeToken',
    );

    connextBridgeToken1 = await ConnextBridgeToken.deploy(
      CHAIN_1,
      MOCK_TOKEN,
      mockConnextHandler.address,
    );

    connextBridgeToken2 = await ConnextBridgeToken.deploy(
      CHAIN_2,
      MOCK_TOKEN,
      mockConnextHandler.address,
    );
  });

  it('Test Case #1 : Should Bridge Token', async () => {
    await connextBridgeToken1.addStableCoin(CHAIN_1, MOCK_TOKEN);

    await connextBridgeToken1.addChainInfo(
      'Chain 1',
      CHAIN_1,
      CHAIN_DOMAIN_1,
      connextBridgeToken1.address,
    );

    await connextBridgeToken1.addChainInfo(
      'Chain 2',
      CHAIN_2,
      CHAIN_DOMAIN_2,
      connextBridgeToken2.address,
    );

    const payload = await etherJS.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint128'],
      [user1.address, MOCK_TOKEN, CHAIN_2],
    );

    await expect(connextBridgeToken1._bridgeConnext(0, CHAIN_1, payload))
      .to.emit(connextBridgeToken1, 'BridgeEvent')
      .withArgs(user1.address, 0);
  });

  it("Test Case #2 : Shouldn't Bridge Token when Destination ChainID doesn't match", async () => {
    await connextBridgeToken1.addStableCoin(CHAIN_1, user1.address);

    await connextBridgeToken1.addChainInfo(
      'Chain 1',
      CHAIN_1,
      CHAIN_DOMAIN_1,
      connextBridgeToken1.address,
    );

    await connextBridgeToken1.addChainInfo(
      'Chain 2',
      CHAIN_2,
      CHAIN_DOMAIN_2,
      connextBridgeToken2.address,
    );

    const payload = await etherJS.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint128'],
      [user1.address, MOCK_TOKEN, '3'],
    );
    await expect(
      connextBridgeToken1._bridgeConnext(0, CHAIN_1, payload),
    ).to.revertedWith('Bridge Destination Chain is not equal address 0');
  });

  it('Test Case #3 : Should Receive on Destination Chain', async () => {
    await connextBridgeToken1.addStableCoin(CHAIN_1, MOCK_TOKEN);

    await connextBridgeToken1.addChainInfo(
      'Chain 1',
      CHAIN_1,
      CHAIN_DOMAIN_1,
      connextBridgeToken1.address,
    );

    await connextBridgeToken1.addChainInfo(
      'Chain 2',
      CHAIN_2,
      CHAIN_DOMAIN_2,
      connextBridgeToken2.address,
    );

    const payload = await etherJS.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint256', 'uint128', 'uint128'],
      [user1.address, MOCK_TOKEN, CHAIN_1, CHAIN_2, '0'],
    );

    const data = connextBridgeToken1.interface.encodeFunctionData('execute', [
      payload,
    ]);

    await mockExecutor.execute(connextBridgeToken2.address, data);

    expect(await mockExecutor.execute(connextBridgeToken2.address, data))
      .to.emit(connextBridgeToken2, 'ExecuteEvent')
      .withArgs(user1.address, 0);
  });

  it("Test Case #4 : Shouldn't Receive on Destination Chain when paused", async () => {
    await connextBridgeToken1.addStableCoin(CHAIN_1, MOCK_TOKEN);

    await connextBridgeToken1.addChainInfo(
      'Chain 1',
      CHAIN_1,
      CHAIN_DOMAIN_1,
      connextBridgeToken1.address,
    );

    await connextBridgeToken1.addChainInfo(
      'Chain 2',
      CHAIN_2,
      CHAIN_DOMAIN_2,
      connextBridgeToken2.address,
    );

    const payload = await etherJS.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint256', 'uint128', 'uint128'],
      [user1.address, MOCK_TOKEN, CHAIN_1, CHAIN_2, '0'],
    );

    await connextBridgeToken2.connect(user1).pause();

    const data = connextBridgeToken1.interface.encodeFunctionData('execute', [
      payload,
    ]);

    await expect(
      mockExecutor.execute(connextBridgeToken2.address, data),
    ).to.revertedWith('Pausable: paused');
  });
});
