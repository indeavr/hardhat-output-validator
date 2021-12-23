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
        events: defaultValue,
        functions: defaultValue,
        variables: defaultValue,
        ctor: defaultValue,
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

const run = async (hre: HardhatRuntimeEnvironment) => {
  const config = hre.config.outputValidator

  const defaultSeverity = config.errorMode ? 'error' : 'warning'

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

  // 1. Setup
  const buildInfo = (
    await Promise.all(qualifiedNames.map(getBuildInfo))
  ).filter((inf) => inf !== undefined) as BuildInfo[]

  const contractBuildInfo: CompilerOutputWithDocsAndPath[] = (
    await Promise.all(qualifiedNames.map(getContractBuildInfo))
  ).filter((inf) => inf !== undefined)

  // 2. Check
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
      if (!config.checks.events) {
        return
      }

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

    const checkFunction = (abiEntity: any) => {
      if (!config.checks.functions && !config.checks.variables) {
        return
      }

      let hasUserDoc = true
      let hasDevDoc = true

      if (!config.checks.variables) {
        const checkIfStateVar = (
          filePath: string,
          contractName: string,
          funcName: string
        ): boolean | undefined => {
          const tryFindFunc = (nodes: any[]) => {
            const funInfo = nodes.find((nn: any) => nn.name === funcName)
            if (funInfo) {
              ref = funInfo
            }
          }
          // sources[contractPath].ast.nodes[]
          // .find(n => n.nodeType === "ContractDefinition")
          // ?.nodes[].find(nn => nn.name === "varName")?.stateVariable
          let ref: any
          buildInfo.forEach((bi) => {
            const key = Object.keys(bi.output.sources).find(
              (k) => k === filePath
            )
            if (key) {
              const ast = bi.output.sources[key].ast
              if (ast) {
                const contractDef = ast.nodes?.find(
                  (n: any) =>
                    n.nodeType === 'ContractDefinition' &&
                    n.canonicalName === contractName
                )
                if (contractDef) {
                  const { baseContracts } = contractDef
                  if (baseContracts && baseContracts.length > 0) {
                    const refIds = baseContracts.map(
                      (bc: any) => bc.baseName.referencedDeclaration
                    )
                    refIds.forEach((refId: number) => {
                      let baseContractNode
                      for (const k in bi.output.sources) {
                        baseContractNode = bi.output.sources[
                          k
                        ].ast?.nodes?.find((n: any) => n.id === refId)

                        if (baseContractNode) {
                          break
                        }
                      }
                      tryFindFunc(baseContractNode?.nodes)
                    })
                  }

                  tryFindFunc(contractDef?.nodes)
                }
              }
            }
          })

          if (ref) {
            return ref?.stateVariable
          }
        }

        if (checkIfStateVar(info.filePath, info.fileName, abiEntity.name)) {
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
            // Checks for params
            if (abiEntity.inputs.length === 1) {
              if (
                !devDocEntryFunc?.params?.[abiEntity.inputs[0].name] &&
                !devDocEntryFunc?.params?.['_0']
              ) {
                addError(
                  ErrorType.MissingParams,
                  defaultSeverity,
                  `Function: (${abiEntity.name})`
                )
              }
            } else {
              abiEntity.inputs.forEach((param: any) => {
                if (!devDocEntryFunc?.params?.[param.name]) {
                  addError(
                    ErrorType.MissingParams,
                    defaultSeverity,
                    `Function: (${abiEntity.name}), param: (${param.name})`
                  )
                }
              })
            }
          }
          if (config.checks.returns && abiEntity.outputs.length > 0) {
            // Check for returns
            if (abiEntity.outputs.length === 1) {
              if (
                !devDocEntryFunc?.returns?.[abiEntity.outputs[0].name] &&
                !devDocEntryFunc?.returns?.['_0']
              ) {
                addError(
                  ErrorType.MissingReturnParams,
                  defaultSeverity,
                  `Function: (${abiEntity.name})`
                )
              }
            } else {
              abiEntity.outputs.forEach((param: any) => {
                if (!devDocEntryFunc?.returns?.[param.name]) {
                  addError(
                    ErrorType.MissingReturnParams,
                    defaultSeverity,
                    `Function: (${abiEntity.name}), returnParam: (${param.name})`
                  )
                }
              })
            }
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

        if (!hasDevDoc) {
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

    if (config.checks.title && !info.devdoc?.title) {
      addError(ErrorType.MissingTitle, config.checks.title)
    }
    if (config.checks.details && !info.devdoc?.details) {
      addError(ErrorType.MissingDetails, config.checks.details)
    }

    const checkIsExternalDependency = (
      filePath: string,
      contractName: string,
      entity: any
    ): boolean => {
      let found = false
      // find in sources
      buildInfo.forEach((bi) => {
        const key = Object.keys(bi.output.sources).find((k) => k === filePath)

        if (key) {
          const ast = bi.output.sources[key].ast
          ast.nodes
            .filter((n: any) => n.nodeType === 'ImportDirective')
            .forEach((n: any) => {
              if (
                !n.file.startsWith('./') ||
                !n.absolutePath.startsWith('contracts')
              ) {
                const refId = n.sourceUnit
                const canonicalName = n.symbolAliases?.foreign?.name
                let contractDef
                for (const k in bi.output.sources) {
                  if (bi.output.sources[k].ast?.id === refId) {
                    const defs = bi.output.sources[k].ast.nodes?.filter(
                      (nn: any) => nn.nodeType === 'ContractDefinition'
                    )
                    if (defs.length > 1 && canonicalName) {
                      contractDef = defs.find(
                        (d: any) => d.canonicalName === canonicalName
                      )
                    } else {
                      contractDef = defs[0]
                    }
                  }

                  if (contractDef) {
                    break
                  }
                }

                if (contractDef) {
                  const func = contractDef.nodes?.find(
                    (n: any) => n.name === entity.name
                  )

                  if (func) {
                    found = true
                  }
                }
              }
            })
        }
      })
      // check for external ImportDirective
      //

      return found
    }

    if (Array.isArray(info.abi)) {
      // Loops through the abi and for each function/event/var check in the user/dev doc.
      info.abi.forEach((entity) => {
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

  const errors = contractBuildInfo.reduce((foundErrors, info) => {
    const docErrors = checkForErrors(info)

    if (docErrors && docErrors.length > 0) {
      const key = info.filePath + ':' + info.fileName
      foundErrors[key] = docErrors
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
  // ====== END ======
}

// check if function name is from external lib ?
// doesnt start with /contracts
