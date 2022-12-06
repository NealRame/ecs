import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    TEventMap,
} from "@nealrame/ts-events"

import {
    SystemMetadataKey,
} from "../constants"

import * as Query from "../query"

import type {
    ISystem,
    ISystemOptions,
} from "../types"

export type ISystemMetadata = Required<ISystemOptions>

export function System(
    options: ISystemOptions
): ClassDecorator {
    return ((target: TConstructor<ISystem>) => {
        const systemMetadata: ISystemMetadata = {
            entities: Query.None,
            events: {},
            priority: 0,
            ...options,
        }
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)
        Reflect.defineMetadata(SystemMetadataKey, systemMetadata, target)
    }) as ClassDecorator
}

export function getSystemPriority(
    System: TConstructor,
): number {
    const metadata = Reflect.getMetadata(SystemMetadataKey, System)
    if (metadata == null) {
        throw new Error(`System ${System.name} does not exists.`)
    }
    return (metadata as ISystemMetadata).priority
}
