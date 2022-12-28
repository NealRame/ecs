import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import {
    SystemMetadataKey,
} from "../constants"

import * as Query from "../query"

import type {
    ISystem,
    ISystemOptions,
    TEntityQueryPredicate,
} from "../types"

export type ISystemMetadata = Required<ISystemOptions>

export function getSystemPriority(
    system: TConstructor<ISystem> | ISystem,
): number {
    if (typeof system !== "function") {
        return getSystemPriority(Object.getPrototypeOf(system).constructor)
    }

    const metadata = Reflect.getMetadata(SystemMetadataKey, system)
    if (metadata == null) {
        throw new Error(`System ${System.name} does not exists.`)
    }

    return (metadata as ISystemMetadata).priority
}

export function getSystemEntitiesPredicate(
    system: TConstructor<ISystem> | ISystem,
): TEntityQueryPredicate {
    if (typeof system !== "function") {
        return getSystemEntitiesPredicate(Object.getPrototypeOf(system).constructor)
    }

    const metadata = Reflect.getMetadata(SystemMetadataKey, system)
    if (metadata == null) {
        throw new Error(`System ${System.name} does not exists.`)
    }

    return (metadata as ISystemMetadata).entities
}

export function System(
    options: ISystemOptions
): ClassDecorator {
    return ((target: TConstructor<ISystem>) => {
        const systemMetadata: ISystemMetadata = {
            entities: Query.None,
            priority: 0,
            ...options,
        }
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)
        Reflect.defineMetadata(SystemMetadataKey, systemMetadata, target)
    }) as ClassDecorator
}
