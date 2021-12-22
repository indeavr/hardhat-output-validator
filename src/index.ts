/* eslint-disable guard-for-in, max-len, no-await-in-loop, no-restricted-syntax */
import { extendConfig, task } from 'hardhat/config'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { HardhatConfig, HardhatUserConfig, BuildInfo } from 'hardhat/types'
import chalk from 'chalk'
import {
  CompilerOutputContractWithDocumentation,
  ErrorType,
  CompilerOutputWithDocsAndPath,
  ErrorInfo,
  SeverityLevel,
} from './types'
import './type-extensions'

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
        ...(userConfig.outputValidator?.checks || {}),
        userDoc: {
          events: defaultValue,
          functions: defaultValue,
          ctor: defaultValue,
          ...(userConfig.outputValidator?.checks?.userDoc || {}),
        },
        devDoc: {
          events: defaultValue,
          functions: defaultValue,
          ctor: defaultValue,
          ...(userConfig.outputValidator?.checks?.devDoc || {}),
        },
      },
      include: userConfig.outputValidator?.include || [],
      exclude: userConfig.outputValidator?.exclude || [],
      runOnCompile: userConfig.outputValidator?.runOnCompile || false,
    }
  }
)

const setupErrors =
  (fileSource: string, fileName: string) =>
  (errorType: ErrorType, extraData?: any) => {
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
          return `${extraData} is missing @dev`

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

task(TASK_COMPILE, async (args, hre, runSuper) => {
  const config = hre.config.outputValidator
  const defaultSeverity = config.errorMode ? 'error' : 'warning'

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

  const checkForErrors = (info: CompilerOutputWithDocsAndPath): ErrorInfo[] => {
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

    const findByName = (searchInObj: any, entityName: string) => {
      if (!searchInObj || !entityName) {
        return
      }

      const key = Object.keys(searchInObj).find((methodSigniture) => {
        const name = methodSigniture.split('(')[0]
        return name === entityName
      })

      if (!key) {
        return
      }
      return searchInObj[key]
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkConstructor = (entity: any) => {
      // TODO:
    }

    const checkEvent = (entity: any) => {
      let hasUserDoc = true
      let hasDevDoc = true
      if (
        config.checks.missingUserDoc &&
        config.checks.userDoc?.events &&
        info.userdoc
      ) {
        const userDocEntry = findByName(info.userdoc.events, entity.name)

        if (!userDocEntry || !userDocEntry.notice) {
          hasUserDoc = false
        }
      }
      if (
        config.checks.missingDevDoc &&
        config.checks.devDoc?.events &&
        info.devdoc
      ) {
        const devDocEntry = findByName(info.devdoc.events, entity.name)

        // TODO: Extend with checks for params, returns
        if (!devDocEntry) {
          hasDevDoc = false
        }
      }

      if (!config.strict) {
        if (!hasDevDoc && !hasUserDoc) {
          addError(
            ErrorType.MissingUserOrDevDoc,
            defaultSeverity,
            `Event: (${entity.name})`
          )
        }
      } else {
        // STRICT
        const userSev =
          config.checks.userDoc?.events || config.checks.missingUserDoc
        addError(
          ErrorType.MissingUserDoc,
          userSev as SeverityLevel,
          `Event: (${entity.name})`
        )

        const severity =
          config.checks.devDoc?.events || config.checks.missingDevDoc
        addError(
          ErrorType.MissingUserDoc,
          severity as SeverityLevel,
          `Event: (${entity.name})`
        )
      }
    }

    const checkFunction = (entity: any) => {
      let hasUserDoc = true
      let hasDevDoc = true
      if (
        config.checks.missingUserDoc &&
        config.checks.userDoc?.functions &&
        info.userdoc
      ) {
        const userDocEntry = findByName(info.userdoc.methods, entity.name)
        if (!userDocEntry || !userDocEntry.notice) {
          hasUserDoc = false
        }
      }
      if (
        config.checks.missingDevDoc &&
        config.checks.devDoc?.functions &&
        info.devdoc
      ) {
        const devDocEntryFunc = findByName(info.devdoc.methods, entity.name)
        const devDocEntryVar = findByName(
          info.devdoc.stateVariables,
          entity.name
        )

        // TODO: Extend with checks for params, returns
        if (!devDocEntryFunc && !devDocEntryVar) {
          hasDevDoc = false
        }
      }

      if (!config.strict) {
        if (!hasDevDoc && !hasUserDoc) {
          addError(
            ErrorType.MissingUserOrDevDoc,
            defaultSeverity,
            `Function: (${entity.name})`
          )
        }
      } else {
        // STRICT
        const userSev =
          config.checks.userDoc?.functions || config.checks.missingUserDoc
        addError(
          ErrorType.MissingUserDoc,
          userSev as SeverityLevel,
          `Function: (${entity.name})`
        )

        const severity =
          config.checks.devDoc?.functions || config.checks.missingUserDoc
        addError(
          ErrorType.MissingDevDoc,
          severity as SeverityLevel,
          `Function: (${entity.name})`
        )
      }
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

  console.log('<<< Starting Output Checks >>> ')

  const allContracts = await hre.artifacts.getAllFullyQualifiedNames()
  // console.log("allContracts", allContracts);
  const qualifiedNames = allContracts
    .filter((str) => str.startsWith('contracts'))
    .filter((path) => {
      // Checks if this contact is included
      const includesPath = config.include.some((str) => path.includes(str))
      const excludesPath = config.exclude.some((str) => path.includes(str))

      return (config.include.length === 0 || includesPath) && !excludesPath
    })
  console.log('qualifiedNames', qualifiedNames)

  // 1. Setup
  const buildInfo = (
    await Promise.all(qualifiedNames.map(getBuildInfo))
  ).filter((inf) => inf !== undefined) as BuildInfo[]

  const contractBuildInfo: CompilerOutputWithDocsAndPath[] = (
    await Promise.all(qualifiedNames.map(getContractBuildInfo))
  ).filter((inf) => inf !== undefined)

  // 2. Check
  const errors = contractBuildInfo.reduce((foundErrors, info) => {
    const docErrors = checkForErrors(info)

    if (docErrors && docErrors.length > 0) {
      foundErrors[info.filePath] = docErrors
    }

    return foundErrors
  }, {} as { [file: string]: ErrorInfo[] })

  // Check for CompilationWarning
  if (config.checks.compilationWarnings) {
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

          errors[err.sourceLocation.file].push({
            text: setupErrors(filePath, fileName)(
              ErrorType.CompilationWarning,
              err.formattedMessage
            ),
            severityLevel: config.checks.compilationWarnings as SeverityLevel,
            type: ErrorType.CompilationWarning,
            at: '',
            filePath,
            fileName,
          })
        })
        break
      }
    }
  }

  // 3. Act
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
})
