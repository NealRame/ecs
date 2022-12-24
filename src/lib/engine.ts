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

function LessPriorityThan(priority: number) {
    return ([system]: [ISystem, [unknown, unknown]]) => {
        return getSystemPriority(Object.getPrototypeOf(system).constructor) < priority
    }
}

class Engine<TRootData extends TEngineData> {
    private container_: IOC.Container
    private controller_: TRootData
    private registry_: IRegistry

    private systemQueue_: Array<[ISystem, [Events.TEmitter, Events.IReceiver]]> = []

    private requestAnimationFrameId_ = 0
    private running_ = false

    private animationFrameCallback_ = () => {
        if (this.running_) {
            for (const [system, [emit]] of this.systemQueue_) {
                system.update?.(this.registry_, emit)
            }
            this.requestAnimationFrameId_ =
                global.requestAnimationFrame(this.animationFrameCallback_)
        }
    }

    private getSystem_(
        System: IOC.TConstructor<ISystem>,
    ): [ISystem, [Events.TEmitter, Events.IReceiver]] | undefined {
        return this.systemQueue_.find(([system]) => {
            return system.constructor === System
        })
    }

    private hasSystem_(
        System: IOC.TConstructor<ISystem>,
    ): boolean {
        return this.getSystem_(System) != null
    }

    private createSystemEntry_(
        System: IOC.TConstructor<ISystem>,
        SystemEvents: TEngineSystemEventMap,
    ): [ISystem, [Events.TEmitter, Events.IReceiver]] {
        const [emit, events] = Events.useEvents()
        const system = this.container_.get(System)
        for (const [eventKey, handler] of Object.entries(SystemEvents)) {
            events.on(eventKey, (...args) => {
                (this.controller_ as any)[handler!].call(this.controller_, this, ...args)
            })
        }
        return [system, [emit, events]]
    }

    private insertSystemEntryIndex_(
        System: IOC.TConstructor<ISystem>,
    ): number {
        const priority = getSystemPriority(System)
        const index = this.systemQueue_.findIndex(LessPriorityThan(priority))
        return index === -1 ? this.systemQueue_.length : index
    }

    private insertSystemEntry_(
        System: IOC.TConstructor<ISystem>,
        SystemEvents: TEngineSystemEventMap,
    ): void {
        if (!this.hasSystem_(System)) {
            const systemEntry = this.createSystemEntry_(System, SystemEvents)
            const systemQueueIndex = this.insertSystemEntryIndex_(System)

            this.systemQueue_.splice(systemQueueIndex, 0, systemEntry)
            this.registry.registerSystem(System)
        }
    }

    constructor(RootComponent: IOC.TConstructor<TRootData>) {
        const metadata = getEngineMetadata(RootComponent)

        this.container_ = new IOC.Container()
        this.container_.set(EntityFactory, metadata.EntityFactory)

        this.registry_ = this.container_.get(Registry)
        this.controller_ = this.container_.get(RootComponent)

        for (const [System, Events] of metadata.Systems) {
            this.insertSystemEntry_(System, Events)
        }
    }

    public get registry() {
        return this.registry_
    }

    public events<TEvents extends Events.TEventMap>(
        System: IOC.TConstructor<ISystem<TEvents>>
    ): Events.IReceiver<TEvents> {
        if (!this.hasSystem_(System)) {
            throw new Error(`System ${System.name} does not exist`)
        }
        // At this point we know that the system exists, so we can safely use
        // the non null assertion operator.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [, [, receiver]] = this.getSystem_(System)!
        return receiver as Events.IReceiver<TEvents>
    }

    public start() {
        if (!this.running_) {
            for (const [system, [emit]] of this.systemQueue_) {
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
            for (const [system, [emit]] of this.systemQueue_) {
                system.stop?.(this.registry_, emit)
            }
        }
        return this
    }

    public reset() {
        this.requestAnimationFrameId_ = 0
        for (const [system, [emit]] of this.systemQueue_) {
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
