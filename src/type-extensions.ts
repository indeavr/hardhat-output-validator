import 'hardhat/types/config';
import { Checks } from "./types";

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    outputValidator?: {
      include?: string[]
      exclude?: string[]
      runOnCompile?: boolean
      errorMode?: boolean
      strict?: boolean
      checks?: Checks
    }
  }

  export interface HardhatConfig {
    outputValidator: {
      include: string[]
      exclude: string[]
      runOnCompile: boolean
      errorMode: boolean
      strict: boolean
      checks: Checks
    }
  }
}
