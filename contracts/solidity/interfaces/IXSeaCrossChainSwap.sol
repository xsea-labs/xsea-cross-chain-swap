//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "../XseaCrossChainSwap.sol";

abstract contract IXSeaCrossChainSwap {
    XseaCrossChainSwap public immutable XseaCrossChainSwap;

    constructor(address _XseaCrossChainSwap) {
        XseaCrossChainSwap = XseaCrossChainSwap(_XseaCrossChainSwap);
    }

    modifier onlyThisContract() {
        require(msg.sender == address(XseaCrossChainSwap), "Not Contract");
        _;
    }

    function _swap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) internal virtual;

    function swap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) public onlyThisContract {
        _swap(amount, payload, apiPayload);
    }
}
