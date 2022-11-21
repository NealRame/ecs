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

import {
    compareSystems,
    getSystems,
} from "./helpers"

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

        if (Reflect.has(global, SystemListKey)) {
            const list = getSystems()
            if (!list.includes(target)) {
                list.push(target)
                list.sort(compareSystems)
            }
        } else {
            Reflect.set(global, SystemListKey, [target])
        }
    }
}
