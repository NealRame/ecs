import type {
    TEntity,
    IEngine,
    ISystem,
} from "./types"

import {
    type EventMap,
    type IEmitter,
    type IReceiver,
    useEvents,
} from "@nealrame/ts-events"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class SystemBase<Events extends EventMap = Record<string, any>>
    implements ISystem<Events>
{
    constructor() {
        [this.emitter, this.events] = useEvents<Events>()
    }

    public readonly emitter: IEmitter<Events>
    public readonly events: IReceiver<Events>

    public abstract update(entities: Set<TEntity>, ecs: IEngine): void
}
