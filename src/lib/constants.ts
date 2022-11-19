import type {
    Token,
} from "@nealrame/ts-injector"

import type {
    IEntityFactory,
} from "./types"

export const EntityFactory: Token<IEntityFactory> = Symbol("Entity factory")
export const SystemMetadataKey = Symbol("System")
