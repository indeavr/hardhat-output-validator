/* eslint-disable guard-for-in, max-len, no-await-in-loop, no-restricted-syntax */
import { extendConfig, task } from 'hardhat/config'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import {
	HardhatConfig,
	HardhatUserConfig,
	BuildInfo,
	HardhatRuntimeEnvironment,
} from 'hardhat/types'
import chalk from 'chalk'
import {
	CompilerOutputContractWithDocumentation,
	CompilerOutputWithDocsAndPath,
	SeverityLevel,
	ErrorObj,
	PluginConfig,
} from './types'
import './type-extensions'
import { checkForErrors } from './checks'
import { checkForCompilationWarnings } from './checks/1compWarnings'

extendConfig(
	(config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
		const errorMode = userConfig.outputValidator?.errorMode || false
		const defaultValue = errorMode ? 'error' : 'warning'

		config.outputValidator = {
			errorMode,
			strict: userConfig.outputValidator?.strict || false,
			checks: {
				title: defaultValue,
				details: defaultValue,
				compilationWarnings: defaultValue,
				missingUserDoc: defaultValue,
				missingDevDoc: defaultValue,
				events: false,
				functions: defaultValue,
				variables: false,
				ctor: false,
				params: defaultValue,
				returns: defaultValue,
				...(userConfig.outputValidator?.checks || {}),
				userDoc: {
					events: userConfig.outputValidator?.checks?.events || defaultValue,
					functions:
						userConfig.outputValidator?.checks?.functions || defaultValue,
					variables:
						userConfig.outputValidator?.checks?.variables || defaultValue,
					ctor: userConfig.outputValidator?.checks?.ctor || defaultValue,
					...(userConfig.outputValidator?.checks?.userDoc || {}),
				},
				devDoc: {
					events: userConfig.outputValidator?.checks?.events || defaultValue,
					functions:
						userConfig.outputValidator?.checks?.functions || defaultValue,
					variables:
						userConfig.outputValidator?.checks?.variables || defaultValue,
					ctor: userConfig.outputValidator?.checks?.ctor || defaultValue,
					...(userConfig.outputValidator?.checks?.devDoc || {}),
				},
			},
			include: userConfig.outputValidator?.include || [],
			exclude: userConfig.outputValidator?.exclude || [],
			runOnCompile: userConfig.outputValidator?.runOnCompile || false,
		}
	}
)

task(TASK_COMPILE, async (args, hre, runSuper) => {
	const config = hre.config.outputValidator

	// Updates the compiler settings
	for (const compiler of hre.config.solidity.compilers) {
		compiler.settings.outputSelection['*']['*'].push('devdoc')
		compiler.settings.outputSelection['*']['*'].push('userdoc')
	}

	// Calls the actual COMPILE task
	await runSuper()

	if (!config.runOnCompile) {
		return
	}

	await run(hre)
})

task('validateOutput', async (args, hre) => {
	console.log('<<< Validating Output for Natspec >>>')

	await run(hre)
})

export let getConfig = () => ({} as PluginConfig)
export let getDefaultSeverity = (): SeverityLevel => 'warning'
export let getFullBuildInfo = () => [] as BuildInfo[]

const run = async (hre: HardhatRuntimeEnvironment) => {
	const config = hre.config.outputValidator as PluginConfig

	getConfig = () => config
	getDefaultSeverity = () => (config.errorMode ? 'error' : 'warning')

	const getBuildInfo = async (
		qualifiedName: string
	): Promise<BuildInfo | undefined> => hre.artifacts.getBuildInfo(qualifiedName)

	// Loops through all the qualified names to get all the compiled contracts
	const getContractBuildInfo = async (
		qualifiedName: string
	): Promise<CompilerOutputWithDocsAndPath> => {
		const [source, name] = qualifiedName.split(':')

		const build = await getBuildInfo(qualifiedName)
		const info = build?.output.contracts[source][
			name
		] as CompilerOutputContractWithDocumentation

		return {
			...info,
			filePath: source,
			fileName: name,
		} as CompilerOutputWithDocsAndPath
	}

	// ====== Start ======
	console.log('<<< Starting Output Checks >>> ')

	// Apply filters
	const allContracts = await hre.artifacts.getAllFullyQualifiedNames()
	const qualifiedNames = allContracts
		.filter((str) => str.startsWith('contracts'))
		.filter((path) => {
			// Checks if this contact is included
			const includesPath = config.include.some((str) => path.includes(str))
			const excludesPath = config.exclude.some((str) => path.includes(str))

			return (config.include.length === 0 || includesPath) && !excludesPath
		})
	console.log('qualifiedNames', qualifiedNames)

	// ============ 1.Setup ============

	// (*0) Full Build Info
	const buildInfo = (
		await Promise.all(qualifiedNames.map(getBuildInfo))
	).filter((inf) => inf !== undefined) as BuildInfo[]

	getFullBuildInfo = () => buildInfo

	// (*1) Subset - build.output.contracts[name]
	const contractBuildInfo: CompilerOutputWithDocsAndPath[] = (
		await Promise.all(qualifiedNames.map(getContractBuildInfo))
	).filter((inf) => inf !== undefined)

	// ============ 2.Checks ============

	// (*0) checks
	console.log('<<< Checking for Errors >>> ')
	const errors: ErrorObj = contractBuildInfo.reduce((foundErrors, info) => {
		const docErrors = checkForErrors(info)

		if (docErrors && docErrors.length > 0) {
			const key = info.filePath + ':' + info.fileName
			foundErrors[key] = docErrors
		}

		return foundErrors
	}, {} as ErrorObj)

	// (*1) checks
	// compilationWarnings
	if (config.checks.compilationWarnings) {
		const compErros = checkForCompilationWarnings(
			buildInfo,
			config.checks.compilationWarnings as SeverityLevel
		)

		Object.keys(compErros).forEach((fi) => {
			if (!errors[fi]) {
				errors[fi] = []
			}
			errors[fi].push(...compErros[fi])
		})
	}

	// ============ 3.Act ============

	const printErrors = (): boolean => {
		let printedErrors = false
		Object.keys(errors).forEach((file) => {
			const errorsInfo = errors[file]

			if (errorsInfo && errorsInfo.length > 0) {
				errorsInfo.forEach((erIn) => {
					if (erIn.severityLevel === 'error') {
						console.error(chalk.red(erIn.text))
						if (!printedErrors) {
							printedErrors = true
						}
					} else {
						console.warn(chalk.yellow(erIn.text))
					}
				})
			}
		})

		return printedErrors
	}

	if (Object.keys(errors).length > 0) {
		const printedErrors = printErrors()
		if (printedErrors) {
			throw new Error('Missing Natspec Comments - Found Errors.')
		}
	}

	console.log('✅ All Contracts have been checked for missing Natspec comments')
	// ====== END ======
}
