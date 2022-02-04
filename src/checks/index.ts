import { CompilerOutputWithDocsAndPath, ErrorInfo, ErrorType } from '../types'
import { getErrorHandler } from '../errors'
import { checkIsExternalDependency } from '../utils'
import { checkConstructor } from './0ctor'
import { checkEvent } from './0events'
import { checkFunction } from './0funcs'
import { getConfig, getFullBuildInfo } from '../index'
import { BuildInfo } from 'hardhat/types'

export const checkForErrors = (
	info: CompilerOutputWithDocsAndPath
): ErrorInfo[] => {
	const config = getConfig()
	const buildInfo: BuildInfo[] = getFullBuildInfo()

	const errorHandler = getErrorHandler(info.filePath, info.fileName)
	const { addError, getAll } = errorHandler

	if (config.checks.title && !info.devdoc?.title) {
		addError(ErrorType.MissingTitle, config.checks.title)
	}
	if (config.checks.details && !info.devdoc?.details) {
		addError(ErrorType.MissingDetails, config.checks.details)
	}

	if (Array.isArray(info.abi)) {
		// Loops through the abi and for each function/event/var check in the user/dev doc.
		info.abi.forEach((entity) => {
			entity.name = `${entity.name}(${
				entity.inputs ? entity.inputs.map((i: any) => i.type).join(',') : ''
			})`

			const isExternal = checkIsExternalDependency(
				info.filePath,
				info.fileName,
				entity,
				buildInfo
			)

			if (isExternal) {
				return
			}

			if (entity.type === 'constructor') {
				checkConstructor(entity, errorHandler, info)
			} else if (entity.type === 'event') {
				checkEvent(entity, errorHandler, info)
			} else if (entity.type === 'function') {
				checkFunction(entity, errorHandler, info, buildInfo)
			}
		})
	}

	// TODO: check for userDoc.errors

	return getAll()
}
