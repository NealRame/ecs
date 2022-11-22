import "reflect-metadata"

import {
    Service,
    ServiceLifecycle,
    TConstructor,
} from "@nealrame/ts-injector"

import {
    GameMetadataKey,
} from "../constants"

import {
    BasicEntityFactory,
} from "../entity"

import type {
    IGameMetadata,
} from "../types"

export function Game(metadata: Partial<IGameMetadata>) {
    return (target: TConstructor) => {
        Service({ lifecycle: ServiceLifecycle.Singleton })(target)
        Reflect.defineMetadata(GameMetadataKey, {
            entityFactory: BasicEntityFactory,
            systems: [],
            ...metadata
        }, target)
    }
}
