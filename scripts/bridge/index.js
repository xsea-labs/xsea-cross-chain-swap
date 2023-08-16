const XseaCrossChainSwap = require('./mdex-cross-chain-swap');
const connextService = require('./connext-service');

async function main() {
  await XseaCrossChainSwap();
  await connextService();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
