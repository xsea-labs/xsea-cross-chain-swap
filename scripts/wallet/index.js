const multisigWallet = require('./multisigWallet');

async function main() {
  await multisigWallet();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
