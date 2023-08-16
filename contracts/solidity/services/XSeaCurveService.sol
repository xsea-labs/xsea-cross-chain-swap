//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "../interfaces/IMdexService.sol";
import "../interfaces/ICurveSwap.sol";
import "../interfaces/ICurveRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XSeaCurveService is IMdexService, Ownable {
    ICurveRegistry public curveRegistry;

    constructor(address _controller) IMdexService(_controller) {}

    function setCurve(ICurveRegistry _curve) public onlyOwner {
        curveRegistry = _curve;
    }

    function curveSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        address reciever
    ) public {
        uint256 min_dy;
        address pool;
        int128 i;
        int128 j;
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        (pool) = curveRegistry.find_pool_for_coins(tokenIn, tokenOut, 0);
        (i, j) = _findIndexToken(tokenIn, tokenOut, pool);
        (min_dy) = ICurveSwap(pool).get_dy_underlying(i, j, amount);
        IERC20(tokenIn).approve(pool, amount);
        ICurveSwap(pool).exchange(i, j, amount, min_dy, reciever);
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        address reciever
    ) internal override {
        require(msg.sender == address(controller), "Only Controller Call");
        curveSwap(tokenIn, tokenOut, amount, reciever);
    }

    function _getDestinationReturnAmount(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) internal view override returns (uint256 token2Amount) {
        address pool;
        uint256 min_dy;
        int128 i;
        int128 j;
        (pool) = curveRegistry.find_pool_for_coins(tokenIn, tokenOut, 0);
        (i, j) = _findIndexToken(tokenIn, tokenOut, pool);
        (min_dy) = ICurveSwap(pool).get_dy_underlying(i, j, amount);
        return min_dy;
    }

    function _findIndexToken(
        address tokenIn,
        address tokenOut,
        address pool
    ) private view returns (int128 indexI, int128 indexJ) {
        address[2] memory coins = curveRegistry.get_coins(pool);

        require(tokenIn != tokenOut, "Destination token can not be source token");

        indexI = -1;
        indexJ = -1;

        indexI = tokenIn == coins[0] ? int128(0) : indexI;
        indexI = tokenIn == coins[1] ? int128(1) : indexI;

        indexJ = tokenOut == coins[0] ? int128(0) : indexJ;
        indexJ = tokenOut == coins[1] ? int128(1) : indexJ;

        require(indexI != -1 && indexJ != -1, "Tokens're not supported!");

        return (indexI, indexJ);
    }
}
