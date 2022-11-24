import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    TEventKey,
    TEventMap,
    TEventListenerCallback,
} from "@nealrame/ts-events"

import {
    SystemEventHookKey,
    SystemMetadataKey,
} from "../constants"

import {
    QueryNone,
} from "../query"

import type {
    ISystem,
    ISystemOptions,
} from "../types"

interface ISystemEventHookMetadata {
    callback: TEventListenerCallback<unknown>
    name: string
    once: boolean
}

export type ISystemMetadata = Required<ISystemOptions> & {
    events: {
        // eslint-disable-next-line @typescript-eslint/ban-types
        on: Record<string, TEventListenerCallback<unknown>>
        // eslint-disable-next-line @typescript-eslint/ban-types
        once: Record<string, TEventListenerCallback<unknown>>
    }
}

function *getSystemEventHooks(
    target: TConstructor<ISystem>,
): IterableIterator<ISystemEventHookMetadata> {
    for (const propName of Object.getOwnPropertyNames(target.prototype)) {
        const prop = Reflect.get(target.prototype, propName)
        if (typeof prop === "function") {
            if (Reflect.hasMetadata(SystemEventHookKey, prop)) {
                const hook = Reflect.getMetadata(
                    SystemEventHookKey,
                    prop,
                ) as ISystemEventHookMetadata
                yield hook
            }
        }
    }
}

function createEventHandlerDecorator(once: boolean) {
    return <TEvents extends TEventMap, K extends TEventKey<TEvents>>(
        target: object,
        eventName: K,
        descriptor: TypedPropertyDescriptor<(value: TEvents[K]) => void>,
    ) => {
        if (eventName === "constructor") {
            throw new Error("Cannot use @On or @Once decorator on constructor")
        }
        if (eventName === "update") {
            throw new Error("Cannot use @On or @Once decorator on update method")
        }
        if (typeof descriptor.value !== "function") {
            throw new Error("Cannot use @On or @Once decorator on non-function")
        }
    
        // Here we can assume that the descriptor.value is a function and so we can
        // safely cast use the non-null assertion operator.
        Reflect.defineMetadata(SystemEventHookKey, {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            callback: descriptor.value,
            name: eventName,
            once,
        }, descriptor.value)
    }
}

export function System(options: ISystemOptions) {
    return (target: TConstructor<ISystem>) => {
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)

        const systemMetadata: ISystemMetadata = {
            entities: QueryNone,
            events: {
                on: {},
                once: {},
            },
            priority: 0,
            ...options,
        }

        for (const { callback, name, once } of getSystemEventHooks(target)) {
            systemMetadata.events[once ? "once" : "on"][name] = callback
        }

        Reflect.defineMetadata(SystemMetadataKey, systemMetadata, target)
    }
}

export const On = createEventHandlerDecorator(false)
export const Once = createEventHandlerDecorator(true)
