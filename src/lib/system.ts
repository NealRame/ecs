import type {
    TEntity,
    IEngine,
    ISystem,
} from "./types"

import {
    type TEventMap,
    type TEmitter,
    type IReceiver,
    useEvents,
} from "@nealrame/ts-events"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class SystemBase<Events extends TEventMap = Record<string, any>>
    implements ISystem<Events>
{
    constructor() {
        [this.emit, this.events] = useEvents<Events>()
    }

    public readonly emit: TEmitter<Events>
    public readonly events: IReceiver<Events>

    public abstract update(entities: Set<TEntity>, ecs: IEngine): void
}
