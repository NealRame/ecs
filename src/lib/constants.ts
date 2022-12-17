import {
    Token,
} from "@nealrame/ts-injector"

import {
    IEntityFactory,
} from "./types"

export const EntityFactory: Token<IEntityFactory> = Symbol("Entity factory key")

export const EngineMetadataKey = Symbol("Engine metadata key")

export const RootComponentKey = Symbol("Root component key")
export const RootEntityKey = Symbol("Root entity key")

export const SystemMetadataKey = Symbol("System metadata key")
export const SystemEventHandlerOnceKey = Symbol("System event handler once key")
