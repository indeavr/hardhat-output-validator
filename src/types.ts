import { CompilerOutputContract } from "hardhat/types";

export interface Checks {
  title?: boolean // default: true,
  details?: boolean // default: true,
  compilationWarnings?: boolean // default: true,
  missingUserDoc?: boolean // default: true,
  missingDevDoc?: boolean // default: true,
}


export interface ErrorInfo {
  type: ErrorType
  text: string
  at: string
  filePath: string
  fileName: string
}

export enum ErrorType {
  MissingTitle,
  MissingDetails,
  CompilationWarning,
  // User Docs
  MissingUserDoc,
  // Dev Docs
  MissingDevDoc,
}

declare interface ErrorUserdocArrayItem {
  notice?: string
}

export interface ErrorDevdocArrayItem {
  details?: string
  params?: {
    [key: string]: string
  }
}

export interface CompilerOutputContractWithDocumentation
    extends CompilerOutputContract {
  devdoc?: {
    author?: string
    details?: string
    title?: string
    errors?: {
      [key: string]: ErrorDevdocArrayItem[]
    }
    events?: {
      [key: string]: {
        details: string
        params: {
          [key: string]: string
        }
      }
    }
    methods?: {
      [key: string]: {
        details?: string
        params: {
          [key: string]: string
        }
        returns: {
          [key: string]: string
        }
      }
    }
    returns?: {
      [key: string]: {
        details?: string
        params: {
          [key: string]: string
        }
      }
    }
    stateVariables?: {
      [key: string]: {
        details?: string
        params: {
          [key: string]: string
        }
        returns: {
          [key: string]: string
        }
      }
    }
  }
  userdoc?: {
    errors?: {
      [key: string]: ErrorUserdocArrayItem[]
    }
    events?: {
      [key: string]: {
        notice: string
      }
    }
    methods?: {
      [key: string]: {
        notice: string
      }
    }
    notice?: string
  }
}

export interface CompilerOutputWithDocsAndPath
    extends CompilerOutputContractWithDocumentation {
  filePath: string
  fileName: string
}
