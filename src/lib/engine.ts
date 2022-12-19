import * as IOC from "@nealrame/ts-injector"

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
} from "./types"

function compareSystems(
    SystemA: IOC.TConstructor<ISystem>,
    SystemB: IOC.TConstructor<ISystem>,
): number {
    return getSystemPriority(SystemA) - getSystemPriority(SystemB)
}

class Engine<TRootData extends TEngineData> {
    private container_: IOC.Container
    private registry_: IRegistry

    private requestAnimationFrameId_ = 0
    private running_ = false

    private animationFrameCallback_ = () => {
        if (this.running_) {
            this.registry_.update()
            this.requestAnimationFrameId_ =
                global.requestAnimationFrame(this.animationFrameCallback_)
        }
    }

    constructor(RootComponent: IOC.TConstructor<TRootData>) {
        this.container_ = new IOC.Container()

        const metadata = getEngineMetadata(RootComponent)

        this.container_.set(EntityFactory, metadata.EntityFactory)
        this.registry_ = this.container_.get(Registry)

        for (const System of Array.from(new Set(metadata.Systems)).sort(compareSystems)) {
            this.registry_.registerSystem(System)
        }
    }

    get registry() {
        return this.registry_
    }

    start() {
        if (!this.running_) {
            this.reset()
            this.running_ = true
            this.animationFrameCallback_()
        }
        return this
    }

    stop() {
        if (this.running_) {
            this.running_ = false
            global.cancelAnimationFrame(this.requestAnimationFrameId_)
        }
        return this
    }

    reset() {
        this.requestAnimationFrameId_ = 0
        this.registry_.reset()
        return this
    }
}

export function createEngine<RootData extends TEngineData>(
    RootComponent: IOC.TConstructor<RootData>,
): IEngine {
    return new Engine(RootComponent)
}
