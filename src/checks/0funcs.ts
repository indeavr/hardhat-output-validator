import {
	ErrorType,
	SeverityLevel,
	CompilerOutputWithDocsAndPath,
	ErrorHandler,
} from '../types'
import { getConfig, getDefaultSeverity } from '../index'
import { checkIfStateVar, findByName } from '../utils'
import { BuildInfo } from 'hardhat/types'

// fullBuildInfo needed for utils.ts checks
export const checkFunction = (
	abiEntity: any,
	{ addError }: ErrorHandler,
	info: CompilerOutputWithDocsAndPath,
	fullBuildInfo: BuildInfo[]
) => {
	const config = getConfig()
	const defaultSeverity = getDefaultSeverity()

	if (!config.checks.functions && !config.checks.variables) {
		return
	}

	let hasUserDoc = true
	let hasDevDoc = true

	if (!config.checks.variables) {
		if (
			checkIfStateVar(
				info.filePath,
				info.fileName,
				abiEntity.name.split('(')[0],
				fullBuildInfo
			)
		) {
			return
		}
	}

	// Check in USER DOC
	if (
		config.checks.missingUserDoc &&
		config.checks.userDoc?.functions &&
		info.userdoc
	) {
		const userDocEntry = findByName(info.userdoc.methods, abiEntity.name)
		if (!userDocEntry || !userDocEntry.notice) {
			hasUserDoc = false
		}
	}

	// Check in DEV DOC
	if (
		config.checks.missingDevDoc &&
		config.checks.devDoc?.functions &&
		info.devdoc
	) {
		let devDocEntryFunc = findByName(info.devdoc.methods, abiEntity.name)

		// check if variable
		if (!devDocEntryFunc) {
			const noBracketName = abiEntity.name.split('(')[0]
			devDocEntryFunc = findByName(info.devdoc.stateVariables, noBracketName)
		}
		// if checks.missingParams ->
		// if func exists in devdoc/userdoc & has params in abi
		// but not in devdoc
		if (!devDocEntryFunc) {
			hasDevDoc = false
		} else {
			const check = (io: 'inputs' | 'outputs') => {
				const paramsOrReturns = io === 'inputs' ? 'params' : 'returns'
				const errorType =
					io === 'inputs'
						? ErrorType.MissingParams
						: ErrorType.MissingReturnParams

				if (config.checks[paramsOrReturns] && abiEntity[io].length > 0) {
					abiEntity[io].forEach((param: any, i: number) => {
						const paramName = param.name || `_${i}`
						if (!devDocEntryFunc?.[paramsOrReturns]?.[paramName]) {
							addError(
								errorType,
								defaultSeverity,
								`Function: (${abiEntity.name}), ${paramsOrReturns.slice(
									0,
									-1
								)}: (${paramName || ''})`
							)
						}
					})
				}
			}

			check('inputs')
			check('outputs')
		}
	}

	if (!config.strict) {
		if (!hasDevDoc && !hasUserDoc) {
			addError(
				ErrorType.MissingUserOrDevDoc,
				defaultSeverity,
				`Function: (${abiEntity.name})`
			)
		}

		if (!hasDevDoc && hasUserDoc) {
			if (abiEntity.inputs.length > 0) {
				addError(
					ErrorType.MissingAllParams,
					defaultSeverity,
					`Function: (${abiEntity.name})`
				)
			}
			if (abiEntity.outputs.length > 0) {
				addError(
					ErrorType.MissingAllReturnParams,
					defaultSeverity,
					`Function: (${abiEntity.name})`
				)
			}
		}
	} else {
		// STRICT
		const userSev =
			config.checks.userDoc?.functions || config.checks.missingUserDoc
		addError(
			ErrorType.MissingUserDoc,
			userSev as SeverityLevel,
			`Function: (${abiEntity.name})`
		)

		const severity =
			config.checks.devDoc?.functions || config.checks.missingUserDoc
		addError(
			ErrorType.MissingDevDoc,
			severity as SeverityLevel,
			`Function: (${abiEntity.name})`
		)
	}
}
