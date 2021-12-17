import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import './src';

const config: HardhatUserConfig = {
  solidity: '0.8.10',
  paths: {
    sources: './examples/contracts/',
  },
  outputChecks: {
    runOnCompile: true,
    errorMode: true,
  },
};

export default config;
