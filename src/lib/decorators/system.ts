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
    SystemEventHandlerOnceKey,
    SystemMetadataKey,
} from "../constants"

import {
    QueryNone,
} from "../query"

import type {
    ISystem,
    ISystemOptions,
} from "../types"

export type ISystemMetadata = Required<ISystemOptions>

export function once(
    target: object,
    eventName: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => void>,
) {
    if (typeof descriptor.value !== "function") {
        throw new Error("Cannot use @Once decorator on non-function")
    }
    Reflect.defineMetadata(SystemEventHandlerOnceKey, {}, descriptor.value)
}

export function System<TEvents extends TEventMap = Record<string, any>>(
    options: ISystemOptions<TEvents>
): ClassDecorator {
    return ((target: TConstructor<ISystem<TEvents>>) => {
        const systemMetadata: ISystemMetadata = {
            entities: QueryNone,
            events: {},
            priority: 0,
            ...options,
        }
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)
        Reflect.defineMetadata(SystemMetadataKey, systemMetadata, target)
    }) as ClassDecorator
}
