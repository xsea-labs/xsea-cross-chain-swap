const latteToken = require('./latte-token');
const mochaToken = require('./mocha-token');

async function main() {
  await latteToken();
  await mochaToken();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
