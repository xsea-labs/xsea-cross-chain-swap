const curveCore = require("./curve-core");
const { deployCurvePool } = require("./curve-pool");

async function main() {
    const token1 = { "name": "LAT", "address": "0x938d9CE22e4F76499b3382d6182e232D16BB410c" };
    const token2 = { "name": "MOC", "address": "0x575beC1c6072F1A5102472ac642db17df60F2B6c" };
    const token3 = { "name": "TEST", "address": "0x68Db1c8d85C09d546097C65ec7DCBFF4D6497CbF" };

    const registryAddress = await curveCore();
    console.log("Deploy curve core success");

    // LAT-MOC
    await deployCurvePool(registryAddress, token1, token2);
    console.log(`Deploy ${token1.name}-${token2.name} pool completed`);

    // LAT-TEST
    await deployCurvePool(registryAddress, token1, token3);
    console.log(`Deploy ${token1.name}-${token3.name} pool completed`);

    // LAT-TEST
    await deployCurvePool(registryAddress, token2, token3);
    console.log(`Deploy ${token2.name}-${token3.name} pool completed`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  