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
    TEntityQueryPredicate,
    ISystem,
} from "../types"

export type SystemMetadata = {
    entities: TEntityQueryPredicate
}

export function System(metadata: Partial<SystemMetadata>) {
    return (target: TConstructor<ISystem>) => {
        Service()(target)
        Reflect.defineMetadata(SystemMetadataKey, {
            entities: QueryNone,
            ...metadata,
        }, target)
    }
}
