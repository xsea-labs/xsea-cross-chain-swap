const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('TEST MULTISIG WALLET', () => {
  let user1, user2, user3, user4, user5, other;
  let multiSigWallet;
  let mockERC20;
  beforeEach(async () => {
    [user1, user2, user3, user4, user5, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    mockERC20 = await MockERC20.deploy();

    await mockERC20.deployed();

    const MultiSigWallet = await ethers.getContractFactory('MultiSigWallet');
    multiSigWallet = await MultiSigWallet.deploy([
      user1.address,
      user2.address,
      user3.address,
      user4.address,
      user5.address,
    ]);

    await multiSigWallet.deployed();
    await multiSigWallet.setStableCoin(mockERC20.address);
  });

  it('Test Case #1 : Should submit withdraw transaction', async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await expect(
      await multiSigWallet
        .connect(user1)
        .submitWithdrawTransaction(other.address, '1000000000000000000'),
    )
      .to.emit(multiSigWallet, 'WithdrawERC20')
      .withArgs(user1.address, other.address, '1000000000000000000');
  });

  it('Test Case #2 : Should confirm transaction', async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');
    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await expect(multiSigWallet.connect(user2).confirmTransaction(1))
      .to.emit(multiSigWallet, 'ConfirmTransaction')
      .withArgs(user2.address, 1);
  });

  it('Test Case #3 : Should Execute Transaction with ERC20', async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user2).confirmTransaction(1);
    await multiSigWallet.connect(user3).confirmTransaction(1);

    await multiSigWallet.connect(user1).updateTransaction(1);

    await expect(multiSigWallet.connect(user1).executeTransaction(1))
      .to.emit(multiSigWallet, 'ExecuteTransaction')
      .withArgs(user1.address, 1);
  });

  it("Test Case #4 : Shouldn't submit transaction if not member", async () => {
    await expect(
      multiSigWallet
        .connect(other)
        .submitWithdrawTransaction(user1.address, '10000000'),
    ).to.revertedWith('not team');
  });

  it("Test Case #5 :  Shouldn't submit transaction if value more than balance", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await expect(
      multiSigWallet
        .connect(user1)
        .submitWithdrawTransaction(user1.address, '2000000000000000000'),
    ).to.revertedWith('erc20 insufficient balance');
  });

  it("Test Case #6 : Shouldn't confirm transaction if not member", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');
    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await expect(
      multiSigWallet.connect(other).confirmTransaction(1),
    ).to.revertedWith('not team');
  });

  it("Test Case #7 :  Shouldn't confirm transaction if transaction executed", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await multiSigWallet.connect(user1).updateTransaction(1);

    await multiSigWallet.connect(user1).executeTransaction(1);

    await expect(
      multiSigWallet.connect(user2).confirmTransaction(1),
    ).to.revertedWith('tx must be status wating');
  });

  it("Test Case #8 : Shouldn't confirm transaction if confirmed", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user2).confirmTransaction(1);

    await expect(
      multiSigWallet.connect(user2).confirmTransaction(1),
    ).to.revertedWith('tx already confirmed');
  });

  it("Test Case #9 : Shouldn't confirm transaction if you own transaction", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await expect(
      multiSigWallet.connect(user1).confirmTransaction(1),
    ).to.revertedWith('owner cannot vote confirm');
  });

  it("Test Case #10 : Shouldn't execute transaction if not member", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await expect(
      multiSigWallet.connect(other).executeTransaction(1),
    ).to.revertedWith('not team');
  });

  it("Test Case #11 : Shouldn't execute transaction if transaction executed", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await multiSigWallet.connect(user1).updateTransaction(1);

    await multiSigWallet.connect(user1).executeTransaction(1);

    await expect(
      multiSigWallet.connect(user2).executeTransaction(1),
    ).to.revertedWith('tx is not already to executed');
  });

  it("Test Case #12 : Shouldn't execute transaction if transaction is state READY", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);

    await multiSigWallet.connect(user1).updateTransaction(1);

    await expect(
      multiSigWallet.connect(user2).executeTransaction(1),
    ).to.revertedWith('tx is not already to executed');
  });

  it("Test Case #13 : Shouldn't execute transaction if transaction has time lock", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await expect(
      multiSigWallet.connect(user2).executeTransaction(1),
    ).to.revertedWith('tx is not already to executed');
  });

  it("Test Case #14 : Shouldn't voting transaction if transaction not state wating", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await expect(
      multiSigWallet.connect(user5).confirmTransaction(1),
    ).to.revertedWith('tx must be status wating');
  });

  it("Test Case #15 : Shouldn't execute transaction if not owner", async () => {
    await mockERC20.mint(multiSigWallet.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await multiSigWallet.connect(user1).updateTransaction(1);

    await expect(
      multiSigWallet.connect(user5).executeTransaction(1),
    ).to.revertedWith('only owner transaction call execute');
  });

  it('Test Case #16 : Shouldn get transaction when transaction is state Queue', async () => {
    await mockERC20.mint(multiSigWallet.address, '4000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet
      .connect(user1)
      .submitWithdrawTransaction(other.address, '1000000000000000000');

    await multiSigWallet.connect(user3).confirmTransaction(1);
    await multiSigWallet.connect(user4).confirmTransaction(1);

    await multiSigWallet.connect(user3).confirmTransaction(2);
    await multiSigWallet.connect(user4).confirmTransaction(2);

    await multiSigWallet.connect(user3).confirmTransaction(3);
    await multiSigWallet.connect(user4).confirmTransaction(3);

    await multiSigWallet.connect(user3).confirmTransaction(4);
    await multiSigWallet.connect(user4).confirmTransaction(4);

    await multiSigWallet.connect(user1).updateTransaction(1);
    await multiSigWallet.connect(user1).updateTransaction(4);

    // console.log(await multiSigWallet.getTransactionStatusQueue());
    await expect(
      await multiSigWallet.getTransactionStatusQueue(),
    ).to.have.lengthOf(2);
  });
});
