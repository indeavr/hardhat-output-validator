import { ErrorType, SeverityLevel, ErrorInfo, ErrorHandler } from './types'

export const getErrorHandler = (
	fileSource: string,
	fileName: string
): ErrorHandler => {
	const foundErrors: ErrorInfo[] = []

	const getErrorText = (errorType: ErrorType, extraData?: any) => {
		const typeToMessage = () => {
			switch (errorType) {
				case ErrorType.MissingTitle:
					return 'Contract is missing title'
				case ErrorType.MissingDetails:
					return 'Contract is missing details'
				case ErrorType.CompilationWarning:
					return `Compilation warnings: \n ${extraData} `

				// User DOCS
				case ErrorType.MissingUserDoc:
					return `${extraData} is missing @notice`

				// DEV DOCS
				case ErrorType.MissingDevDoc:
					return `${extraData} is missing @dev comment`
				case ErrorType.MissingParams:
					return `${extraData} is missing @param comment`
				case ErrorType.MissingReturnParams:
					return `${extraData} is missing @return comment`

				case ErrorType.MissingAllParams:
					return `${extraData} is missing (all) @param comments`
				case ErrorType.MissingAllReturnParams:
					return `${extraData} is missing (all) @return comments`

				// NON STRICT
				case ErrorType.MissingUserOrDevDoc:
					return `${extraData} is missing documentation`
				default:
					return undefined
			}
		}

		return `${
			errorType !== ErrorType.CompilationWarning ? 'Comments Error' : ''
		}: ${typeToMessage()}\n   @ ${fileName} \n   --> ${fileSource}\n`
	}

	const addError = (
		errorType: ErrorType,
		severityLevel: SeverityLevel,
		extraData?: any
	) => {
		const text = getErrorText(errorType, extraData)
		foundErrors.push({
			text,
			severityLevel,
			type: errorType,
			at: '',
			filePath: fileSource,
			fileName,
		})
	}

	return {
		addError,
		getAll: () => foundErrors,
	}
}
