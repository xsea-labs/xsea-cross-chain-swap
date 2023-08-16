//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {

    constructor() ERC20("Mock Token", "MT")  {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address from, address to, uint256 amount) external {
        _transfer(from, to, amount);
    }
}
