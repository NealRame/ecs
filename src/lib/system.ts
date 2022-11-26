import type {
    TEventMap,
} from "@nealrame/ts-events"

import type {
    TSystemEventHandlerMap,
} from "./types"

export function defineSystemEventHandler<TEvents extends TEventMap>(
    handlerMap: TSystemEventHandlerMap<TEvents>,
): TSystemEventHandlerMap<TEvents> {
    return handlerMap
}
