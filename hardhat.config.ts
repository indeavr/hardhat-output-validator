import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import './src'

const config: HardhatUserConfig = {
  solidity: '0.8.10',
  outputValidator: {
    runOnCompile: true,
    errorMode: true,
    // strict: true,
    checks: {
      compilationWarnings: false,
      devDoc: {
        events: false,
      },
    },
  },
}

export default config
