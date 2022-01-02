import { CompilerOutputWithDocsAndPath, ErrorInfo, ErrorType, SeverityLevel, ErrorObj } from "../types";
import { setupErrors } from "../errors";
import { checkIsExternalDependency } from "../utils";
import { checkConstructor } from "./0ctor";
import { checkEvent } from "./0events";
import { checkFunction } from "./0funcs";
import { getConfig } from "../index";
import { BuildInfo } from "hardhat/types";


export class Checker {
	private buildInfo: BuildInfo[];
	private contractInfo: CompilerOutputWithDocsAndPath[];

	private errors: ErrorObj;

	constructor(bi: BuildInfo[], ci: CompilerOutputWithDocsAndPath[]) {
		this.buildInfo = bi;
		this.contractInfo = ci;
		this.errors = {};
	}

	public check = async (): Promise<ErrorObj> => {
		const errors: ErrorObj = this.contractInfo.reduce((foundErrors, info) => {
			const docErrors = checkForErrors(info, buildInfo)

			if (docErrors && docErrors.length > 0) {
				const key = info.filePath + ':' + info.fileName
				foundErrors[key] = docErrors
			}

			return foundErrors
		}, {} as ErrorObj)

		return errors;
	}


}

export const checkForErrors = (info: CompilerOutputWithDocsAndPath): ErrorInfo[] => {
	const config = getConfig();

	const foundErrors: ErrorInfo[] = []
	const getErrorText = setupErrors(info.filePath, info.fileName)

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
			filePath: info.filePath,
			fileName: info.fileName,
		})
	}

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
				entity
			)

			if (isExternal) {
				return
			}

			if (entity.type === 'constructor') {
				checkConstructor(entity)
			} else if (entity.type === 'event') {
				checkEvent(entity)
			} else if (entity.type === 'function') {
				checkFunction(entity)
			}
		})
	}

	// TODO: check for userDoc.errors

	return foundErrors
}
