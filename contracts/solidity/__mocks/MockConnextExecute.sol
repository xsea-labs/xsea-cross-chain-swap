// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract MockExecutor {
    address private _originSender;
    uint32 private _origin;

    function execute(address to, bytes memory data) public {
        (bool success, bytes memory log) = to.call(data);
        require(success, string(log));
    }
}
