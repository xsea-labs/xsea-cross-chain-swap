//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

interface ISwap {
    function uniSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        address reciever
    ) external;

    function curveSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        address reciever
    ) external;
}
