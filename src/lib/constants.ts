import type {
    Token,
} from "@nealrame/ts-injector"

import type {
    IEntityFactory,
} from "./types"

export const EntityFactory: Token<IEntityFactory> = Symbol("Entity factory")

export const SystemListKey = Symbol("System list")
export const SystemMetadataKey = Symbol("System metadata")
