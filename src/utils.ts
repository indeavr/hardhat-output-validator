import { BuildInfo } from 'hardhat/types'

export const findByName = (searchInObj: any, entityName: string) => {
  if (!searchInObj || !entityName) {
    return
  }

  const key = Object.keys(searchInObj).find(
    (methodSigniture) => methodSigniture === entityName
  )

  if (!key) {
    return
  }
  return searchInObj[key]
}

export const checkIsExternalDependency = (
  filePath: string,
  contractName: string,
  entity: any,
  buildInfo: BuildInfo[]
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

            let contractDef
            for (const k in bi.output.sources) {
              if (bi.output.sources[k].ast?.id === refId) {
                const defs = bi.output.sources[k].ast.nodes?.filter(
                  (nn: any) => nn.nodeType === 'ContractDefinition'
                )
                if (defs.length > 1) {
                  contractDef = defs.find(
                    (d: any) => d.canonicalName === contractName
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
                (nn: any) => nn.name === entity.name.split('(')[0]
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

export const checkIfStateVar = (
  filePath: string,
  contractName: string,
  funcName: string,
  buildInfo: BuildInfo[]
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
    const key = Object.keys(bi.output.sources).find((k) => k === filePath)
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
                baseContractNode = bi.output.sources[k].ast?.nodes?.find(
                  (n: any) => n.id === refId
                )

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
