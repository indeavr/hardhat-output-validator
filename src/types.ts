import { CompilerOutputContract } from 'hardhat/types'
import { HardhatUserConfig } from 'hardhat/types/config'

export interface HardhatUserConfigExtended extends HardhatUserConfig {
	outputValidator: PluginConfig
}

export interface PluginConfig {
	include: string[]
	exclude: string[]
	runOnCompile: boolean
	errorMode: boolean
	strict: boolean
	checks: Checks
}

export interface Checks {
	title?: Severity // default: errorMode value - true,
	details?: Severity // default: errorMode value - true,
	compilationWarnings?: Severity // default: errorMode value - true,
	missingUserDoc?: Severity // default: errorMode value - true,
	missingDevDoc?: Severity // default: errorMode value - true,
	events?: Severity
	functions?: Severity
	variables?: Severity
	params?: Severity
	returns?: Severity
	ctor?: Severity
	devDoc?: DocChecks
	userDoc?: UserDocChecks
}

export interface DocChecks {
	events?: Severity
	functions?: Severity
	variables?: Severity
	ctor?: Severity
}

export interface UserDocChecks extends DocChecks {}

export type SeverityLevel = 'error' | 'warning'
export type Severity = SeverityLevel | false

export interface ErrorInfo {
	type: ErrorType
	severityLevel: SeverityLevel
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
	MissingParams,
	MissingReturnParams,
	MissingAllParams,
	MissingAllReturnParams,
	// non-strict
	MissingUserOrDevDoc,
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

export type AddErrorFunc = (
	errorType: ErrorType,
	severityLevel: SeverityLevel,
	extraData?: any
) => void

export type ErrorHandler = {
	addError: AddErrorFunc
	getAll: () => ErrorInfo[]
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

export type ErrorObj = { [file: string]: ErrorInfo[] }
