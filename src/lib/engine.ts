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

type TEngineSystemEventsCallbacks = Map<string, (...args: Array<any>) => void>

class Engine<TRootData extends TEngineData> {
    private container_: IOC.Container
    private controller_: TRootData
    private registry_: IRegistry

    private systemQueue_: Array<[ISystem, [Events.TEmitter, Events.IReceiver]]> = []
    private systemEvents_: Map<ISystem, TEngineSystemEventsCallbacks> = new Map()

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

    private createSystemEventsCallbacks_(
        SystemEvents: TEngineSystemEventMap,
    ): TEngineSystemEventsCallbacks {
        const callbacks = new Map()
        for (const [eventKey, handlerKey] of Object.entries(SystemEvents) as Array<[string, string]>) {
            callbacks.set(eventKey, (...args: Array<unknown>) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this.controller_ as any)[handlerKey].call(this.controller_, this, ...args)
            })
        }
        return callbacks
    }

    private createSystemEntry_(
        System: IOC.TConstructor<ISystem>,
    ): [ISystem, [Events.TEmitter, Events.IReceiver]] {
        return [
            this.container_.get(System),
            Events.useEvents(),
        ]
    }

    private insertSystemEntry_(
        System: IOC.TConstructor<ISystem>,
    ): void {
        const priority = getSystemPriority(System)
        const entry = this.createSystemEntry_(System)
        const index = this.systemQueue_.findIndex(LessPriorityThan(priority))
        if (index === -1) {
            this.systemQueue_.push(entry)
        } else {
            this.systemQueue_.splice(index, 0, entry)
        }
    }

    private registerSystem_(
        System: IOC.TConstructor<ISystem>,
    ): void {
        if (!this.hasSystem_(System)) {
            this.registry.registerSystem(System)
            this.insertSystemEntry_(System)
        }
    }

    private registerSystemEvents_(
        System: IOC.TConstructor<ISystem>,
        SystemEvents: TEngineSystemEventMap,
    ): void {
        if (!this.hasSystem_(System)) {
            this.systemEvents_.set(
                this.container_.get(System),
                this.createSystemEventsCallbacks_(SystemEvents),
            )
        }
    }

    constructor(RootComponent: IOC.TConstructor<TRootData>) {
        const metadata = getEngineMetadata(RootComponent)

        this.container_ = new IOC.Container()
        this.container_.set(EntityFactory, metadata.EntityFactory)

        this.registry_ = this.container_.get(Registry)
        this.controller_ = this.container_.get(RootComponent)

        for (const [System, Events] of metadata.Systems) {
            this.registerSystem_(System)
            this.registerSystemEvents_(System, Events)
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
