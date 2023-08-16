//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
import "./interfaces/IXSeaService.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./XSeaRoutingManagement.sol";

contract XSeaController is Ownable, Pausable, XSeaRoutingManagement {
    using SafeMath for uint256;

    address public stableCoin;
    address public multisigWallet;
    uint256 public fee = 1;

    function getDestinationReturnAmount(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 routeIndex
    ) external view returns (uint256) {
        IXSeaService service = tradingRoutes[routeIndex].service;
        return service.getDestinationReturnAmount(tokenIn, tokenOut, amount);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 routeIndex
    ) external whenNotPaused {
        require(IERC20(tokenIn).balanceOf(msg.sender) >= amount, "not enough erc20 balance");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        uint256 netAmount = _serviceFee(amount);
        _swap(routeIndex, tokenIn, tokenOut, amount - netAmount, msg.sender);

        // collect fee
        _swap(routeIndex, tokenIn, stableCoin, netAmount, multisigWallet);
    }

    function spiltSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256[] calldata routes,
        uint256[] calldata srcAmounts
    ) external whenNotPaused {
        require(routes.length > 0, "routes can not be empty");
        require(routes.length == srcAmounts.length, "routes and srcAmounts lengths mismatch");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        uint256 netAmount = _serviceFee(amount);

        for (uint256 i = 0; i < routes.length; i++) {
            uint256 tradingRouteIndex = routes[i];
            uint256 srcAmount = srcAmounts[i];
            _swap(tradingRouteIndex, tokenIn, tokenOut, srcAmount, msg.sender);
        }
        // colect fee
        _swap(routes[0], tokenIn, stableCoin, netAmount, multisigWallet);
    }

    function setMultisigWallet(address _multisigWallet) public onlyOwner {
        multisigWallet = _multisigWallet;
    }

    function setPause() public onlyOwner {
        _pause();
    }

    function setUnPause() public onlyOwner {
        _unpause();
    }

    function setStableCoin(address token) public onlyOwner {
        stableCoin = token;
    }

    function setFee(uint256 newFee) public onlyOwner {
        fee = newFee;
    }

    function _serviceFee(uint256 amount) private view returns (uint256) {
        uint256 totalFee = amount.mul(fee).div(100);
        return totalFee;
    }

    function _swap(
        uint256 routeIndex,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        address receiver
    ) private onlyTradingRouteEnabled(routeIndex) {
        IXSeaService service = tradingRoutes[routeIndex].service;
        IERC20(tokenIn).approve(address(service), amount);
        service.swap(tokenIn, tokenOut, amount, receiver);
    }
}
