# @version 0.3.3
"""
@title Mdex Curve Registry PoolInfo
@license MIT
@author Curve.Fi
@notice Large getters designed for off-chain use
"""
MAX_COINS: constant(int128) = 2

interface AddressProvider:
    def get_registry() -> address: view
    def admin() -> address: view


interface Registry:
    def get_coins(_pool: address) -> address[MAX_COINS]: view
    def get_balances(_pool: address) -> uint256[MAX_COINS]: view
    def get_decimals(_pool: address) -> uint256[MAX_COINS]: view
    def get_lp_token(_pool: address) -> address: view
    def get_pool_name(_pool: address) -> String[64]: view
    def pool_count() -> uint256: view
    def pool_list(i: int256) -> address: view


struct PoolInfo:
    pool_address: address
    coins: address[MAX_COINS]
    balances: uint256[MAX_COINS]
    decimals: uint256[MAX_COINS]
    lp_token: address
    name: String[64]

struct PoolCoins:
    coins: address[MAX_COINS]
    decimals: uint256[MAX_COINS]


address_provider: public(AddressProvider)


@external
def __init__(_provider: address):
    self.address_provider = AddressProvider(_provider)


@view
@external
def get_pool_count() -> uint256:
    registry: address = self.address_provider.get_registry()
    count: uint256 = Registry(registry).pool_count()

    return count


@view
@external
def get_pool_by_address(_pool: address) -> PoolInfo:
    """
    @notice Get information on a pool by address
    @dev Reverts if the pool address is unknown
    @param _pool Pool address
    @return coins, balances, decimals, lp token, name
    """
    registry: address = self.address_provider.get_registry()

    return PoolInfo({
        pool_address: _pool,
        coins: Registry(registry).get_coins(_pool),
        balances: Registry(registry).get_balances(_pool),
        decimals: Registry(registry).get_decimals(_pool),
        lp_token: Registry(registry).get_lp_token(_pool),
        name: Registry(registry).get_pool_name(_pool),
    })


@view
@external
def get_pool_coins(_pool: address) -> PoolCoins:
    """
    @notice Get information on coins in a registered pool
    @dev Empty values in the returned arrays may be ignored
    @param _pool Pool address
    @return Coin addresses and coin decimals
    """
    registry: address = self.address_provider.get_registry()

    return PoolCoins({
        coins: Registry(registry).get_coins(_pool),
        decimals: Registry(registry).get_decimals(_pool),
    })