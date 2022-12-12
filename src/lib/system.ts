import {
    All,
} from "./query"

import type {
    TSystemConfig,
} from "./types"

export function defineSystem(config: TSystemConfig) {
    return {
        priority: 0,
        entities: All,
        ...config,
    }
}
