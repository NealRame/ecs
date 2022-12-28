import "reflect-metadata"

import {
    TEventKey,
    TEventMap,
} from "@nealrame/ts-events"

import {
    type TConstructor,
    Service,
    ServiceLifecycle,
} from "@nealrame/ts-injector"

import {
    EngineMetadataKey,
} from "../constants"

import type {
    IEngine,
    ISystem,
    TEngineMetadata,
    TEngineOptions,
} from "../types"

export function getEngineMetadata(
    Target: TConstructor,
): TEngineMetadata {
    return Reflect.getMetadata(EngineMetadataKey, Target) as TEngineMetadata
}

export function getOrCreateEngineMetadata(
    Target: TConstructor,
): TEngineMetadata {
    if (!Reflect.hasMetadata(EngineMetadataKey, Target)) {
        Reflect.defineMetadata(EngineMetadataKey, {
            Systems: new Map(),
        }, Target)
    }
    return getEngineMetadata(Target)
}

export function Engine(options: TEngineOptions) {
    return (Target: TConstructor) => {
        Service({ lifecycle: ServiceLifecycle.Singleton })(Target)

        const metadata = getOrCreateEngineMetadata(Target)

        if (options.Systems != null) {
            for (const System of options.Systems) {
                if (!metadata.Systems.has(System)) {
                    metadata.Systems.set(System, {})
                }
            }
        }

        return Target
    }
}

export function On<TEvents extends TEventMap>(
    TargetSystem: TConstructor<ISystem<TEvents>>,
) {
    return <K extends TEventKey<TEvents>>(eventKey: K) => {
        return (
            target: any,
            propertyKey: string,
            descriptor: TypedPropertyDescriptor<(engine: IEngine, value: TEvents[K]) => void>,
        ) => {
            const { Systems } = getOrCreateEngineMetadata(target.constructor)
            const SystemEvents = {
                ...(Systems.get(TargetSystem) ?? {}),
                [eventKey]: propertyKey,
            }
            Systems.set(TargetSystem, SystemEvents)
            return descriptor
        }
    }
}
