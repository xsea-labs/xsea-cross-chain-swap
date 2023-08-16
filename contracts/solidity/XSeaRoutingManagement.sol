//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IXSeaService.sol";
contract XSeaRoutingManagement is Ownable {
    
     struct Route {
      string name;
      bool enable;
      IXSeaService service;
    }

    Route[] public tradingRoutes;

    modifier onlyTradingRouteEnabled(uint _index) {
        require(tradingRoutes[_index].enable, "This trading route is disabled");
        _;
    }

    modifier onlyTradingRouteDisabled(uint _index) {
        require(tradingRoutes[_index].enable, "This trading route is enabled");
        _;
    }

     function addTradingRoute(
        string calldata _name,
        IXSeaService _routingAddress
    )
      external
      onlyOwner
    {
        tradingRoutes.push(Route({
            name: _name,
            enable: true,
            service: _routingAddress
        }));
    }


    function disableTradingRoute(
        uint256 _index
    )
        public
        onlyOwner
        onlyTradingRouteEnabled(_index)
    {
        tradingRoutes[_index].enable = false;
    }


        function enableTradingRoute(
        uint256 _index
    )
        public
        onlyOwner
        onlyTradingRouteDisabled(_index)
    {
        tradingRoutes[_index].enable = true;
    }

    function getRoute(uint256 routeIndex) public view returns (Route memory route ){
        return tradingRoutes[routeIndex];
    }

    function allRoutesLength() public view returns (uint256) {
        return tradingRoutes.length;
    }


    function isTradingRouteEnabled(uint256 _index) public view returns (bool) {
        return tradingRoutes[_index].enable;
    }

}