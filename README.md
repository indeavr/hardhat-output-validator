# Output Validator

![version](https://img.shields.io/npm/v/hardhat-output-validator)
![npm](https://img.shields.io/npm/dt/hardhat-output-validator)

Zero-config Hardhat plugin to check the output of the compiler for any problems.

- 🤪 Zero-configuration required
- 🔍 Checks for : [NatSpec](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html) comments & Compilation warnings
- 🔧 (TODO) Extendable with custom checks

## 📦 Installation

First thing to do is to install the plugin in your Hardhat project:

```bash
# Using yarn
yarn add hardhat-output-validator

# Or using npm
npm i hardhat-output-validator
```

Next step is simply to include the plugin into your `hardhat.config.js` or `hardhat.config.ts` file:

```typescript
// Using JavaScript
require('hardhat-output-validator');

// Using ES6 or TypeScript
import 'hardhat-output-validator';
```

And you're done! Documentation will be automatically checked on the next compilation and you'll see the result in your console. :)

## 📝 Usage

The Output Validator loops through all your Solidity contracts and checks for missing [NatSpec](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html) .
For example, given the following function:

```solidity
/// @notice Does another thing when the function is called.
/// @dev More info about doing another thing when the function is called.
/// @param num A random number
/// @return A random variable
function anotherThing(uint256 num) external pure returns (uint256);
```

It will generate the following output:

> Comments Error: Function: (anotherThing) is missing @notice  <br />
> @ IExampleContract <br />
> --> contracts/IExampleContract.sol 

The plugin is compatible with all the NatSpec tags (except custom ones),
and checks all events and external / public functions and state variables.

## 🔧 Config

You can change the default settings in your Hardhat config file:

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-output-validator';

const config: HardhatUserConfig = {
  // ... Your Hardhat config
  outputValidator: {
      runOnCompile: true,
      errorMode: true,
      exclude: ['contracts/test-helpers', 'contracts/test-libraries', "IExampleContract"],
      checks: {
          title: true,
          details: false,
          compilationWarnings: true,
          missingUserDoc: true,
          missingDevDoc: true,
      },
  },
};

export default config;
```

Here are all the configuration parameters that are currently available, but as said above, all of them are entirely optional:

| Parameter | Description | Default value |
| -------- | -------- | -------- |
| `errorMode` | If any checks don't pass it'll throw and error (on compilation). | `true` |
| `runOnCompile`     | True if the plugin should make the checks on every compilation | `true`     |
| `include` | List of all the contract / interface / library names to include. An empty array will check for everything | `[]` |
| `exclude` | List of all the contract / interface / library names to exclude. | `[]` |
| `checks` | Enable/Disable certain checks | `{ title: true, details: true, compilationWarnings: true, missingUserDoc: true, missingDevDoc: true }` |

## ⛑ Contribute 

All feedback and contributions are welcome. Feel free to open an issue ! 


- `written for Optimism`
- `inspired by DoDoc`
