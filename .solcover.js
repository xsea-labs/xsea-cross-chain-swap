module.exports = {
  istanbulReporter: ['cobertura', 'text'],
  skipFiles: [
    'solidity/__mocks/TOKEN.sol',
    'solidity/__mocks/MOCKERC20.sol',
    'solidity/__mocks/MockConnextExecute.sol',
    'solidity/__mocks/MockConnextHandler.sol',
    'solidity/bridges/',
  ],
};
