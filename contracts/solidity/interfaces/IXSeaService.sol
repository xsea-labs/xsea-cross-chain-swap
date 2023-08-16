//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "../XSeaController.sol";
abstract contract IXSeaService {
    XSeaController public immutable controller;

     constructor(address _controller) {
        controller = XSeaController(_controller);
    }

    modifier onlyController() {
        require(msg.sender == address(controller), "Not Controller");
        _;
    }

    function getDestinationReturnAmount(address tokenIn, address tokenOut, uint256 amount) public onlyController view returns(uint256 token2Amount){
        token2Amount = _getDestinationReturnAmount(tokenIn, tokenOut, amount);
    }

    function swap(address tokenIn, address tokenOut, uint256 amount, address reciever) public onlyController {
        _swap(tokenIn, tokenOut, amount, reciever);
    }
    function _swap(address tokenIn, address tokenOut, uint256 amount, address reciever) internal virtual;

    function _getDestinationReturnAmount(address tokenIn, address tokenOut, uint256 amount) internal virtual view returns(uint256 token2Amount);


}