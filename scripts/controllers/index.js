const XSeaController = require('./mdex-controller');

async function main() {
  await XSeaController();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
