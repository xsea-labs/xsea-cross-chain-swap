//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "./interfaces/IXSeaController.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XSeaBestRateQuery is Ownable {
    using SafeMath for uint256;

    IXSeaController public mdex;

    function setContrller(IXSeaController _mdex) public onlyOwner {
        mdex = _mdex;
    }

    function oneRoute(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256[] calldata routes
    ) external view returns (uint256 routeIndex, uint256 amountOut) {
        for (uint256 i = 0; i < routes.length; i++) {
            uint256 route = routes[i];
            uint256 _amountOut = _getRate(tokenIn, tokenOut, amount, route);
            if (_amountOut > amountOut) {
                amountOut = _amountOut;
                routeIndex = route;
            }
        }
    }

    function splitTwoRoutes(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256[] calldata routes,
        uint256 percentStep
    )
        external
        view
        returns (
            uint256[2] memory routeIndexs,
            uint256[2] memory volumns,
            uint256 amountOut
        )
    {
        require(percentStep != 0 && percentStep < 100 && 100 % percentStep == 0, "This percent step is not allowed");
        for (uint256 currentStep = 0; currentStep <= 50; currentStep += percentStep) {
            for (uint256 i = 0; i < routes.length; i++) {
                for (uint256 j = 0; j < routes.length; j++) {
                    if (i == j) {
                        continue;
                    }

                    uint256 _amountOut = _getRateTwoRoutes(
                        tokenIn,
                        tokenOut,
                        amount,
                        routes[i],
                        routes[j],
                        currentStep
                    );

                    if (_amountOut > amountOut) {
                        amountOut = _amountOut;
                        routeIndexs = [routes[i], routes[j]];
                        volumns = [currentStep, 100 - currentStep];
                    }
                }
            }
        }
    }

    function _getRate(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 routeIndex
    ) private view returns (uint256) {
        bytes memory payload = abi.encodeWithSelector(
            mdex.getDestinationReturnAmount.selector,
            tokenIn,
            tokenOut,
            amount,
            routeIndex
        );

        (bool success, bytes memory data) = address(mdex).staticcall(payload);

        if (success) {
            return abi.decode(data, (uint256));
        } else {
            return 0;
        }
    }

    function _getRateTwoRoutes(
        address src,
        address dest,
        uint256 amount,
        uint256 route1,
        uint256 route2,
        uint256 percent
    )
        private
        view
        returns (
            uint256 // amountOut
        )
    {
        uint256 amountIn1 = amount.mul(percent).div(100);
        uint256 amountIn2 = amount.sub(amountIn1);
        uint256 _amountOut1 = _getRate(src, dest, amountIn1, route1);
        uint256 _amountOut2 = _getRate(src, dest, amountIn2, route2);
        return _amountOut1 + _amountOut2;
    }
}
