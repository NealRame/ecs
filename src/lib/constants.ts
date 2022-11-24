import type {
    Token,
} from "@nealrame/ts-injector"

import type {
    IEngine,
} from "./types"

export const EngineKey: Token<IEngine> = Symbol("Engine")

export const GameMetadataKey = Symbol("Game metadata")

export const SystemEventHookKey = Symbol("System event hook")
export const SystemMetadataKey = Symbol("System metadata")
