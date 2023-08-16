//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@connext/nxtp-contracts/contracts/core/connext/interfaces/IConnextHandler.sol";
import "@connext/nxtp-contracts/contracts/core/promise/interfaces/ICallback.sol";
import "@connext/nxtp-contracts/contracts/core/connext/libraries/LibConnextStorage.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IXSeaCrossChainSwap.sol";
import "../interfaces/IXSeaService.sol";
import "../interfaces/ISwap.sol";
import "../amm/periphery/interfaces/IUniswapV2Router02.sol";
import "../services/XSeaUniSwapService.sol";

contract ConnextService is Ownable, Pausable, IXSeaCrossChainSwap, ICallback {
    IConnextHandler public immutable connext;
    address public immutable promiseRouter;
    XSeaController public XSeaController;

    mapping(uint32 => address) public mdexBridgeAddress;
    mapping(uint32 => address) public assetAddress;

    modifier onlyPromiseRouter() {
        require(msg.sender == address(promiseRouter), "Expected PromiseRouter");
        _;
    }

    constructor(
        IConnextHandler _connext,
        address _promiseRouter,
        address _mdexCrossChain
    ) IXSeaCrossChainSwap(_mdexCrossChain) {
        connext = _connext;
        promiseRouter = _promiseRouter;
    }

    function setBridgeAddress(uint32 domainId, address brideAddress) public onlyOwner {
        mdexBridgeAddress[domainId] = brideAddress;
    }

    function setAsset(uint32 domainId, address tokenAdress) public onlyOwner {
        assetAddress[domainId] = tokenAdress;
    }

    function setController(XSeaController _controller) public onlyOwner {
        XSeaController = _controller;
    }

    function singleSwap(bytes calldata data) external whenNotPaused returns (bytes memory) {
        uint32 destinationDomain;
        address sender;
        address tokenDestinationAddress;
        uint256 routeIndex;
        uint256 amount;

        (sender, tokenDestinationAddress, amount, routeIndex, destinationDomain) = abi.decode(
            data,
            (address, address, uint256, uint256, uint32)
        );

        _swapToken(sender, assetAddress[destinationDomain], tokenDestinationAddress, amount, routeIndex);

        return data;
    }

    function splitSwap(bytes calldata data) external whenNotPaused returns (bytes memory) {
        uint32 destinationDomain;
        address sender;
        address tokenDestinationAddress;
        uint256 amount;
        uint256[] memory routes;
        uint256[] memory spiltAmount;

        (sender, tokenDestinationAddress, amount, routes, spiltAmount, destinationDomain) = abi.decode(
            data,
            (address, address, uint256, uint256[], uint256[], uint32)
        );

        for (uint256 i = 0; i < routes.length; i++) {
            uint256 tradingRouteIndex = routes[i];
            uint256 srcAmount = spiltAmount[i];
            _swapToken(sender, assetAddress[destinationDomain], tokenDestinationAddress, srcAmount, tradingRouteIndex);
        }

        return data;
    }

    function _swapToken(
        address reciever,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 routeIndex
    ) internal {
        // Route memory new_route = route;
        string memory route_name = XSeaController.getRoute(routeIndex).name;
        address route_address = address(XSeaController.getRoute(routeIndex).service);

        if (keccak256(abi.encodePacked(route_name)) == keccak256(abi.encodePacked("CurveSwap"))) {
            IERC20(tokenIn).approve(route_address, amount);
            ISwap(route_address).curveSwap(tokenIn, tokenOut, amount, reciever);
        }
        if (keccak256(abi.encodePacked(route_name)) == keccak256(abi.encodePacked("UniSwap"))) {
            IERC20(tokenIn).approve(route_address, amount);
            ISwap(route_address).uniSwap(tokenIn, tokenOut, amount, reciever);
        }
    }

    function connextSwap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) internal {
        uint32 originDomain;
        uint32 destinationDomain;
        address sender;
        address tokenDestinationAddress;
        bytes calldata _payload = payload;
        bytes calldata _apiPayload = apiPayload;
        uint256 _amount = amount;
        // api payload
        bool isSpiltSwap;

        (isSpiltSwap, , , ) = abi.decode(apiPayload, (bool, uint256, uint256[], uint256[]));

        (sender, tokenDestinationAddress, originDomain, destinationDomain) = abi.decode(
            payload,
            (address, address, uint32, uint32)
        );

        IERC20(assetAddress[originDomain]).transferFrom(msg.sender, address(this), _amount);
        IERC20(assetAddress[originDomain]).approve(address(connext), _amount);

        if (isSpiltSwap) {
            _isSplitSwap(_amount, _payload, _apiPayload);
        } else {
            _isNotSplitSwap(_amount, _payload, _apiPayload);
        }
    }

    function _isSplitSwap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) internal {
        uint32 originDomain;
        uint32 destinationDomain;
        address sender;
        address tokenDestinationAddress;
        uint256 _amount = amount;
        uint256[] memory routeIndex;
        uint256[] memory spiltAmount;

        (, , routeIndex, spiltAmount) = abi.decode(apiPayload, (bool, uint256, uint256[], uint256[]));
        (sender, tokenDestinationAddress, originDomain, destinationDomain) = abi.decode(
            payload,
            (address, address, uint32, uint32)
        );

        bytes memory data = abi.encode(
            sender,
            tokenDestinationAddress,
            (_amount / 100) * 97,
            routeIndex,
            spiltAmount,
            destinationDomain
        );

        bytes4 selector = bytes4(keccak256("splitSwap(bytes)"));
        bytes memory callData = abi.encodeWithSelector(selector, data);

        CallParams memory callParams = CallParams({
            to: mdexBridgeAddress[destinationDomain],
            callData: callData,
            originDomain: originDomain,
            destinationDomain: destinationDomain,
            agent: sender,
            recovery: sender,
            forceSlow: false,
            receiveLocal: false,
            callback: address(this),
            callbackFee: 0,
            relayerFee: 0,
            destinationMinOut: (_amount / 100) * 97
        });

        XCallArgs memory xcallArgs = XCallArgs({
            params: callParams,
            transactingAsset: assetAddress[originDomain],
            transactingAmount: _amount,
            originMinOut: (_amount / 100) * 97
        });

        connext.xcall(xcallArgs);
    }

    function _isNotSplitSwap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) internal {
        uint32 originDomain;
        uint32 destinationDomain;
        address sender;
        address tokenDestinationAddress;
        uint256 routeIndex;
        uint256 _amount = amount;

        (, routeIndex, , ) = abi.decode(apiPayload, (bool, uint256, uint256[], uint256[]));
        (sender, tokenDestinationAddress, originDomain, destinationDomain) = abi.decode(
            payload,
            (address, address, uint32, uint32)
        );

        bytes memory data = abi.encode(
            sender,
            tokenDestinationAddress,
            (_amount / 100) * 97,
            routeIndex,
            destinationDomain
        );
        bytes4 selector = bytes4(keccak256("singleSwap(bytes)"));
        bytes memory callData = abi.encodeWithSelector(selector, data);

        CallParams memory callParams = CallParams({
            to: mdexBridgeAddress[destinationDomain],
            callData: callData,
            originDomain: originDomain,
            destinationDomain: destinationDomain,
            agent: sender,
            recovery: sender,
            forceSlow: false,
            receiveLocal: false,
            callback: address(this),
            callbackFee: 0,
            relayerFee: 0,
            destinationMinOut: (_amount / 100) * 97
        });

        XCallArgs memory xcallArgs = XCallArgs({
            params: callParams,
            transactingAsset: assetAddress[originDomain],
            transactingAmount: _amount,
            originMinOut: (_amount / 100) * 97
        });

        connext.xcall(xcallArgs);
    }

    function _swap(
        uint256 amount,
        bytes calldata payload,
        bytes calldata apiPayload
    ) internal override {
        require(msg.sender == address(XseaCrossChainSwap), "Only Mdex Cross-Chain Call");
        connextSwap(amount, payload, apiPayload);
    }

    function callback(
        bytes32 transferId,
        bool success,
        bytes memory data
    ) external onlyPromiseRouter {
        uint256 newValue = abi.decode(data, (uint256));
    }
}
