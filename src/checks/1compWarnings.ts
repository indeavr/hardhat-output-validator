import { ErrorType, SeverityLevel, ErrorObj } from '../types'
import { getErrorHandler } from '../errors'

export const checkForCompilationWarnings = (
	buildInfo: any,
	severityLevel: SeverityLevel
): ErrorObj => {
	const errors: any = {}

	for (const bi of buildInfo) {
		const outputErrors = (bi.output as any).errors
		if (outputErrors && outputErrors.length > 0) {
			outputErrors.forEach((err: any) => {
				if (!errors[err.sourceLocation.file]) {
					errors[err.sourceLocation.file] = []
				}
				const filePath = err.sourceLocation.file
				const fileComponents = filePath.split('/')
				const fileName = fileComponents[fileComponents.length - 1]

				const errorHandler = getErrorHandler(filePath, fileName)
				const { addError, getAll } = errorHandler

				addError(
					ErrorType.CompilationWarning,
					severityLevel,
					err.formattedMessage
				)
				errors[err.sourceLocation.file].push(...getAll())
			})
			break
		}
	}

	return errors
}
