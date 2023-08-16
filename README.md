# How to deploy Smart Contract

**1. Deploy XSeaController**

```shell
npm run deploy:rinkeby  scripts/controllers/index.js
```

**2. Deploy XseaCrossChainSwap**

- Deploy XseaCrossChainSwap

  **You must disable Connext Service before Deploy XseaCrossChainSwap**

  ```javaScript
   const XseaCrossChainSwap = require('./mdex-cross-chain-swap');
   const connextService = require('./connext-service');

   async function main() {
     await XseaCrossChainSwap();
     // await connextService();
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });

  ```

  ```shell
  npm run deploy:rinkeby  scripts/bridge/index.js
  ```

- In the file connext-service.js you must set the parameter in constructor are ConnextHandler Address, promiseRouter, MdexCross Address

       ```javaScript
       const hre = require('hardhat');

       module.exports = async function main() {
       // Deploy Token
       const ConnextService = await hre.ethers.getContractFactory('ConnextService');
       const connextService = await ConnextService.deploy(
          'Connext Handler Address',
          'Promise Router Address',
          'Mdex Cross Chain Address',
        );

        await connextService.deployed();
        };

       ```
       **You must disable XseaCrossChainSwap before deploy Connext Service**
        ```javaScript
        const XseaCrossChainSwap = require('./mdex-cross-chain-swap');
        const connextService = require('./connext-service');

        async function main() {
        // await XseaCrossChainSwap();
           await connextService();
        }

        main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
       });

       ```
       ```shell
       npm run deploy:rinkeby  scripts/bridge/index.js
       ```

  **3. Deploy AMM Uniswap**

```shell
npm run deploy:rinkeby  scripts/amm-uniswap/00_deploy-core.js
```

**4. Deploy Best Rate**

```shell
npm run deploy:rinkeby  scripts/best-rate/index.js
```

**5. Deploy Tokens**

```shell
npm run deploy:rinkeby  scripts/tokens/index.js
```

**6. Deploy Multisig Wallet**
**You can set constructor in the file multisigWallet.js follow this example**

```javaScript
const hre = require('hardhat');
module.exports = async function main() {
  const MultiSigWallet = await hre.ethers.getContractFactory('MultiSigWallet');
  const multiSigWallet = await MultiSigWallet.deploy([
    'Wallet 1',
    'Wallet 2',
    'Wallet 3',
    'Wallet 4',
    'Wallet 5',
    'Wallet 6',
    'Wallet 7',
  ]);

  await multiSigWallet.deployed();
};

```

```shell
npm run deploy:rinkeby  scripts/wallet/index.js
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
