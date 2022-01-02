import { ErrorType, SeverityLevel } from "../types";

export const checkEvent = (entity: any) => {
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
