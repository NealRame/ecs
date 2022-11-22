import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import {
    SystemListKey,
    SystemMetadataKey,
} from "../constants"

import {
    QueryNone,
} from "../query"

import type {
    TEntityQueryPredicate,
    ISystem,
} from "../types"

export type ISystemMetadata = {
    entities: TEntityQueryPredicate
    priority: number
}

export function System(metadata: Partial<ISystemMetadata>) {
    return (target: TConstructor<ISystem>) => {
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)
        Reflect.defineMetadata(SystemMetadataKey, {
            entities: QueryNone,
            priority: 0,
            ...metadata,
        }, target)
    }
}
