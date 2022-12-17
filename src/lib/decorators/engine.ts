import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import {
    EngineMetadataKey,
} from "../constants"

import {
    BasicEntityFactory,
} from "../entity"

import type {
    TEngineMetadata,
} from "../types"

export function Engine(metadata: Partial<TEngineMetadata>) {
    return (Target: TConstructor) => {
        Service({ lifecycle: ServiceLifecycle.Singleton })(Target)
        Reflect.defineMetadata(EngineMetadataKey, {
            EntityFactory: BasicEntityFactory,
            Systems: [],
            ...metadata
        }, Target)
    }
}

export function getEngineMetadata(
    Target: TConstructor,
): TEngineMetadata {
    return Reflect.getMetadata(EngineMetadataKey, Target) as TEngineMetadata
}
