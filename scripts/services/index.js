const uniswapService = require('./uniswap-service');
const curveService = require('./curveswap-service');

async function main() {
  await uniswapService();
  await curveService();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
