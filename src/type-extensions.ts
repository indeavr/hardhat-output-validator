import 'hardhat/types/config';
import { Checks } from "./types";

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    outputChecks?: {
      include?: string[]
      exclude?: string[]
      runOnCompile?: boolean
      errorMode?: boolean
      checks?: Checks
    }
  }

  export interface HardhatConfig {
    outputChecks: {
      include: string[]
      exclude: string[]
      runOnCompile: boolean
      errorMode: boolean
      checks: Checks
    }
  }
}
