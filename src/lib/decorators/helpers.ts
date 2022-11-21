import {
    type TConstructor,
} from "@nealrame/ts-injector"

import {
    SystemListKey,
    SystemMetadataKey,
} from "../constants"

import {
    type ISystem,
} from "../types"

export function compareSystems(
    a: TConstructor<ISystem>,
    b: TConstructor<ISystem>,
): number {
    const aMetadata = Reflect.getMetadata(SystemMetadataKey, a)
    const bMetadata = Reflect.getMetadata(SystemMetadataKey, b)
    return aMetadata.priority - bMetadata.priority
}

export function getSystems(): Array<TConstructor<ISystem>> {
    return Reflect.get(global, SystemListKey) ?? []
}