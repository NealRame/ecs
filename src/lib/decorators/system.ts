import {
    Service,
    TConstructor,
} from "@nealrame/ts-injector"

import {
    SystemMetadataKey,
} from "../constants"

import {
    QueryNone,
} from "../query"

import type {
    IEntityQueryPredicate,
    ISystem,
} from "../types"

export type SystemMetadata = {
    predicate: IEntityQueryPredicate
}

export function System(metadata: Partial<SystemMetadata>) {
    return (target: TConstructor<ISystem>) => {
        Service()(target)
        Reflect.defineMetadata(SystemMetadataKey, {
            predicate: QueryNone,
            ...metadata,
        }, target)
    }
}
