import { ErrorType, SeverityLevel } from "../types";
import { getConfig } from "../index";
import { checkIfStateVar } from "../utils";
import { BuildInfo } from "hardhat/types";


// fullBuildInfo needed for utils.ts checks
export const checkFunction = (abiEntity: any, fullBuildInfo: BuildInfo[]) => {
	const config = getConfig();

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
	if (
		config.checks.missingDevDoc &&
		config.checks.devDoc?.functions &&
		info.devdoc
	) {
		const devDocEntryFunc = findByName(info.devdoc.methods, abiEntity.name)
		// if checks.missingParams ->
		// if func exists in devdoc/userdoc & has params in abi
		// but not in devdoc
		if (!devDocEntryFunc) {
			hasDevDoc = false
		} else {
			if (config.checks.params && abiEntity.inputs.length > 0) {
				abiEntity.inputs.forEach((param: any, i: number) => {
					const paramName = param.name || `_${i}`
					if (!devDocEntryFunc?.params?.[paramName]) {
						addError(
							ErrorType.MissingParams,
							defaultSeverity,
							`Function: (${abiEntity.name}), param: (${paramName || ''})`
						)
					}
				})
			}
			if (config.checks.returns && abiEntity.outputs.length > 0) {
				// Check for returns
				abiEntity.outputs.forEach((param: any, i: number) => {
					const paramName = param.name || `_${i}`
					if (!devDocEntryFunc?.returns?.[paramName]) {
						addError(
							ErrorType.MissingReturnParams,
							defaultSeverity,
							`Function: (${abiEntity.name}), returnParam: (${
								paramName || ''
							})`
						)
					}
				})
			}
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
