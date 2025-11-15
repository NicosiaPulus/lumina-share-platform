import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedLuminaShare = await deploy("LuminaShare", {
    from: deployer,
    log: true,
  });

  console.log(`LuminaShare contract deployed at: `, deployedLuminaShare.address);
};
export default func;
func.id = "deploy_LuminaShare"; // id required to prevent reexecution
func.tags = ["LuminaShare"];

