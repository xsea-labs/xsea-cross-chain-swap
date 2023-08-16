const mdexBestRate = require('./best-rate');

async function main() {
  await mdexBestRate();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
