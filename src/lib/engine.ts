import * as IOC from "@nealrame/ts-injector"
import * as Events from "@nealrame/ts-events"

import {
    EntityFactory,
} from "./constants"

import {
    getEngineMetadata,
    getSystemPriority,
} from "./decorators"

import {
    Registry,
} from "./registry"

import type {
    IEngine,
    IRegistry,
    ISystem,
    TEngineData,
    TEngineSystemEventMap,
} from "./types"

type ISystemEventsManager = {
    start(receiver: Events.IReceiver): void
    stop(receiver: Events.IReceiver): void
}

function createSystemEventsManager(
    engine: IEngine,
    controller: object,
    events: TEngineSystemEventMap,
) {
    const eventHandlers = Object.entries(events).reduce((handlers, [eventKey, handlerKey]) => {
        return Object.assign(handlers, {
            [eventKey]: (...args: Array<unknown>) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (controller as any)[handlerKey as string].call(controller, engine, ...args)
            }
        })
    }, {}) as unknown as Events.TEventHandlers

    const start = (receiver: Events.IReceiver) => {
        receiver.connect(eventHandlers)
    }

    const stop = (receiver: Events.IReceiver) => {
        receiver.disconnect(eventHandlers)
    }

    return { start, stop }
}

function PriorityLessThan(System: IOC.TConstructor<ISystem>) {
    const priority = getSystemPriority(System)
    return (system: ISystem) => {
        return getSystemPriority(Object.getPrototypeOf(system).constructor) < priority
    }
}

class Engine<TRootData extends TEngineData> {
    private container_: IOC.Container
    private controller_: TRootData
    private registry_: IRegistry

    private requestAnimationFrameId_ = 0
    private running_ = false

    private systemsQueue_: Array<ISystem> = []
    private systemsEvents_: Map<ISystem, [Events.TEmitter, Events.IReceiver]> = new Map()
    private systemsEventsManagers_: Map<ISystem, ISystemEventsManager> = new Map()

    private animationFrameCallback_ = () => {
        if (this.running_) {
            for (const system of this.systemsQueue_) {
                // By construction we know that the system exists in the map.
                // We can safely use the non null assertion operator here.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [emit,] = this.systemsEvents_.get(system)!
                system.update?.(this.registry_, emit)
            }
            this.requestAnimationFrameId_ =
                global.requestAnimationFrame(this.animationFrameCallback_)
        }
    }

    private getSystem_(
        System: IOC.TConstructor<ISystem>,
    ): ISystem | undefined {
        return this.systemsQueue_.find(system => system.constructor === System)
    }

    private hasSystem_(
        System: IOC.TConstructor<ISystem>,
    ): boolean {
        return this.getSystem_(System) != null
    }

    private registerSystem_(
        System: IOC.TConstructor<ISystem>,
        SystemEvents: TEngineSystemEventMap,
    ): void {
        if (!this.hasSystem_(System)) {
            const system = this.container_.get(System)
            const systemQueueIndex = this.systemsQueue_.findIndex(PriorityLessThan(System))
            const systemEventsManager = createSystemEventsManager(this, this.controller_, SystemEvents)
            const [emit, receiver] = Events.createEmitterReceiver()

            // Insert system in the queue
            if (systemQueueIndex === -1) {
                this.systemsQueue_.push(system)
            } else {
                this.systemsQueue_.splice(systemQueueIndex, 0, system)
            }

            // Register system emitter/receiver
            this.systemsEvents_.set(system, [emit, receiver])

            // Register system events
            this.systemsEventsManagers_.set(system, systemEventsManager)

            // Register system in the registry
            this.registry.registerSystem(System)
        }
    }

    constructor(RootComponent: IOC.TConstructor<TRootData>) {
        const metadata = getEngineMetadata(RootComponent)

        this.container_ = new IOC.Container()
        this.container_.set(EntityFactory, metadata.EntityFactory)

        this.registry_ = this.container_.get(Registry)
        this.controller_ = this.container_.get(RootComponent)

        for (const [System, SystemEvents] of metadata.Systems) {
            this.registerSystem_(System, SystemEvents)
        }
    }

    public get registry() {
        return this.registry_
    }

    public events<TEvents extends Events.TEventMap>(
        System: IOC.TConstructor<ISystem<TEvents>>
    ): Events.IReceiver<TEvents> {
        const system = this.getSystem_(System)

        if (system == null) {
            throw new Error(`System ${System.name} does not exist`)
        }

        // At this point we know that the system exists, so we can safely use
        // the non null assertion operator.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [, receiver] = this.systemsEvents_.get(system)!
        return receiver as Events.IReceiver<TEvents>
    }

    public start() {
        if (!this.running_) {
            for (const system of this.systemsQueue_) {
                // By construction we know that the system exists in the map.
                // We can safely use the non null assertion operator here.

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const systemEventsManager = this.systemsEventsManagers_.get(system)!

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [emit, receiver] = this.systemsEvents_.get(system)!

                systemEventsManager.start(receiver)
                system.start?.(this.registry_, emit)
            }
            this.reset()
            this.running_ = true
            this.animationFrameCallback_()
        }
        return this
    }

    public stop() {
        if (this.running_) {
            this.running_ = false
            global.cancelAnimationFrame(this.requestAnimationFrameId_)
            for (const system of this.systemsQueue_) {
                // By construction we know that the system exists in the map.
                // We can safely use the non null assertion operator here.

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const systemEventsManager = this.systemsEventsManagers_.get(system)!

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [emit, receiver] = this.systemsEvents_.get(system)!

                systemEventsManager.stop(receiver)
                system.stop?.(this.registry_, emit)
            }
        }
        return this
    }

    public reset() {
        this.requestAnimationFrameId_ = 0
        for (const system of this.systemsQueue_) {
            // By construction we know that the system exists in the map.
            // We can safely use the non null assertion operator here.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [emit] = this.systemsEvents_.get(system)!
            system.reset?.(this.registry_, emit)
        }
        return this
    }
}

export function createEngine<RootData extends TEngineData>(
    RootComponent: IOC.TConstructor<RootData>,
): IEngine {
    return new Engine(RootComponent)
}
