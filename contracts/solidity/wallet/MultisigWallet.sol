//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract MultiSigWallet {
    enum StatusTransaction {
        WATING,
        READY,
        QUEUE,
        FAIL,
        SUCCESS
    }
    address[] public teams;
    uint256 public numConfirmationsRequired;
    uint256 public transactionCount;
    uint256 public delayTime;
    address public stableCoin;

    struct Transaction {
        uint256 id;
        address to;
        address caller;
        uint256 value;
        uint256 numConfirmations;
        uint256 numNoConfirmations;
        uint256 timestamp;
        uint256 timeLock;
        StatusTransaction status;
    }

    mapping(address => bool) public isTeam;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    mapping(uint256 => Transaction) public transactionById;

    modifier onlyTeam() {
        require(isTeam[msg.sender], "not team");
        _;
    }

    modifier notConfirmed(uint256 transactionId) {
        require(!isConfirmed[transactionId][msg.sender], "tx already confirmed");
        _;
    }

    modifier ownerNotConfirmed(uint256 transactionId, address owner) {
        require(transactionById[transactionId].caller != owner, "owner cannot vote confirm");
        _;
    }

    modifier isReady(uint256 transactionId) {
        require(transactionById[transactionId].status == StatusTransaction.READY, "tx is not already to executed");
        _;
    }

    modifier isCancel(uint256 transactionId) {
        require(transactionById[transactionId].timeLock > block.timestamp, "tx is aleady approve");
        _;
    }

    modifier noTimeLock(uint256 transactionId) {
        require(transactionById[transactionId].timeLock < block.timestamp, "tx is wating approve");
        _;
    }

    modifier isWating(uint256 transactionId) {
        require(transactionById[transactionId].status == StatusTransaction.WATING, "tx must be status wating");
        _;
    }

    modifier isOwnerTransaction(uint256 transactionId, address owner) {
        require(transactionById[transactionId].caller == owner, "only owner transaction call execute");
        _;
    }

    event WithdrawETH(address caller, address to, uint256 value);
    event WithdrawERC20(address caller, address to, uint256 value);
    event ConfirmTransaction(address indexed member, uint256 indexed transactionId);
    event ExecuteTransaction(address indexed member, uint256 indexed transactionId);

    constructor(address[] memory team) {
        require(team.length > 0, "teams required");
        for (uint256 i = 0; i < team.length; i++) {
            address member = team[i];

            require(member != address(0), "invalid owner");
            require(!isTeam[member], "owner not unique");

            isTeam[member] = true;
            teams.push(member);
        }

        numConfirmationsRequired = 3;
        delayTime = 1;
    }

    function setNumberOfRequire(uint256 number) public onlyTeam {
        numConfirmationsRequired = number;
    }

    function submitWithdrawTransaction(address to, uint256 value) public onlyTeam {
        require(IERC20(stableCoin).balanceOf(address(this)) >= value, "erc20 insufficient balance");

        transactionCount += 1;

        transactionById[transactionCount] = Transaction({
            id: transactionCount,
            to: to,
            caller: msg.sender,
            value: value,
            numConfirmations: 1,
            numNoConfirmations: 0,
            timestamp: block.timestamp,
            timeLock: 0,
            status: StatusTransaction.WATING
        });

        emit WithdrawERC20(msg.sender, to, value);
    }

    function updateTransaction(uint256 id) public onlyTeam {
        Transaction storage transaction = transactionById[id];
        if (transaction.status == StatusTransaction.QUEUE && transaction.timeLock <= block.timestamp) {
            transaction.status = StatusTransaction.READY;
        }
    }

    function getNumberTransactionStatusQueue() public view returns (uint256 numberTransaction) {
        for (uint256 i = 1; i < transactionCount + 1; i++) {
            if (transactionById[i].status == StatusTransaction.QUEUE) {
                numberTransaction += 1;
            }
        }
        return numberTransaction;
    }

    function getTransactionStatusQueue() public view returns (Transaction[] memory) {
        uint256 numberTransaction = getNumberTransactionStatusQueue();
        Transaction[] memory transactions = new Transaction[](numberTransaction);
        uint256 count;
        for (uint256 i = 1; i < transactionCount + 1; i++) {
            if (transactionById[i].status == StatusTransaction.QUEUE) {
                if (count <= numberTransaction) {
                    transactions[count] = transactionById[i];
                    count++;
                } else {
                    count = 0;
                }
            }
        }
        return transactions;
    }

    function getBalance() public view onlyTeam returns (uint256) {
        return IERC20(stableCoin).balanceOf(address(this));
    }

    function setDelay(uint256 delay) public onlyTeam {
        delayTime = delay;
    }

    function setStableCoin(address _stableCoin) public onlyTeam {
        stableCoin = _stableCoin;
    }

    function confirmTransaction(uint256 transactionId)
        public
        onlyTeam
        notConfirmed(transactionId)
        ownerNotConfirmed(transactionId, msg.sender)
        isWating(transactionId)
    {
        Transaction storage transaction = transactionById[transactionId];

        require(transaction.id == transactionId, "tx does not exist");

        transaction.numConfirmations += 1;

        isConfirmed[transactionId][msg.sender] = true;

        if (transaction.numConfirmations >= numConfirmationsRequired) {
            transaction.status = StatusTransaction.QUEUE;
            transaction.timeLock = block.timestamp + delayTime;
        }

        emit ConfirmTransaction(msg.sender, transactionId);
    }

    function cancelTransaction(uint256 transactionId) public onlyTeam isCancel(transactionId) {
        Transaction storage transaction = transactionById[transactionId];
        require(transaction.id == transactionId, "tx does not exist");
        transaction.status = StatusTransaction.FAIL;
    }

    function noConfirmTransaction(uint256 transactionId)
        public
        onlyTeam
        notConfirmed(transactionId)
        ownerNotConfirmed(transactionId, msg.sender)
        isWating(transactionId)
    {
        Transaction storage transaction = transactionById[transactionId];

        require(transaction.id == transactionId, "tx does not exist");

        transaction.numNoConfirmations += 1;

        isConfirmed[transactionId][msg.sender] = true;

        if (transaction.numNoConfirmations >= numConfirmationsRequired) {
            transaction.status = StatusTransaction.FAIL;
        }

        emit ConfirmTransaction(msg.sender, transactionId);
    }

    function getTransactions() public view returns (Transaction[] memory) {
        Transaction[] memory transactions = new Transaction[](transactionCount);
        for (uint256 i = 1; i < transactionCount + 1; i++) {
            transactions[i - 1] = transactionById[i];
        }
        return transactions;
    }

    function executeTransaction(uint256 transactionId)
        public
        onlyTeam
        isReady(transactionId)
        noTimeLock(transactionId)
        isOwnerTransaction(transactionId, msg.sender)
    {
        Transaction storage transaction = transactionById[transactionId];

        require(transaction.numConfirmations >= numConfirmationsRequired, "cannot execute tx");

        require(IERC20(stableCoin).balanceOf(address(this)) >= transaction.value, "erc20 insufficient balance");

        transaction.status = StatusTransaction.SUCCESS;

        IERC20(stableCoin).transfer(transaction.to, transaction.value);

        emit ExecuteTransaction(msg.sender, transactionId);
    }
}
