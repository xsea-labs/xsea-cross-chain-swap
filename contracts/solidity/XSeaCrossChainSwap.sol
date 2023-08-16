//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IXSeaCrossChainSwap.sol";
import "./XSeaController.sol";

contract XseaCrossChainSwap is Ownable, Pausable {
    using SafeMath for uint256;

    address public stableCoin;
    IXSeaCrossChainSwap public serviceCrossChainSwap;
    XSeaController public XSeaController;

    // isSpiltSwap, routeIndex, routeIndex[], spiltAmount[]
    // case 1 : no spilt swap => false, 1, [], []
    // case 2 : yes spilt swap => true, 0, [1,2], [10000000000,10000000000]
    function swap(
        address tokenIn,
        uint256 amount,
        uint256 routeIndex,
        bytes calldata payload,
        bytes calldata apiPayload
    ) external whenNotPaused {
        require(IERC20(tokenIn).balanceOf(msg.sender) >= amount, "not enough erc20 balance");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        _swap(tokenIn, stableCoin, amount, routeIndex);
        _crossChainSwap(IERC20(stableCoin).balanceOf(address(this)), payload, apiPayload);
    }

    function splitSwap(
        address tokenIn,
        uint256 amount,
        uint256[] calldata routes,
        uint256[] calldata srcAmounts,
        bytes calldata payload,
        bytes calldata apiPayload
    ) external whenNotPaused {
        require(routes.length > 0, "routes can not be empty");
        require(routes.length == srcAmounts.length, "routes and srcAmounts lengths mismatch");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenIn).approve(address(XSeaController), amount);
        XSeaController.spiltSwap(tokenIn, stableCoin, amount, routes, srcAmounts);
        _crossChainSwap(IERC20(stableCoin).balanceOf(address(this)), payload, apiPayload);
    }

    function setPause() public onlyOwner {
        _pause();
    }

    function setUnPause() public onlyOwner {
        _unpause();
    }

    function setStableCoin(address _token) public onlyOwner {
        stableCoin = _token;
    }

    function setController(XSeaController _controller) public onlyOwner {
        XSeaController = _controller;
    }

    function setService(IXSeaCrossChainSwap _service) public onlyOwner {
        serviceCrossChainSwap = _service;
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 routeIndex
    ) internal {
        IERC20(tokenIn).approve(address(XSeaController), amount);
        XSeaController.swap(tokenIn, tokenOut, amount, routeIndex);
    }

    function _crossChainSwap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) private {
        IERC20(stableCoin).approve(address(serviceCrossChainSwap), amount);
        serviceCrossChainSwap.swap(amount, payload, apiPayload);
    }
}
