import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import './src'

const config: HardhatUserConfig = {
  solidity: '0.8.10',
  outputValidator: {
    runOnCompile: false,
    errorMode: true,
    // strict: true,
    checks: {
      compilationWarnings: false,
      variables: false,
      events: false,
    },
  },
}

export default config
