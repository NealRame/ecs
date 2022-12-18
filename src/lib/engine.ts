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
    TEntity,
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
    private rootEntity_: TEntity
    private rootComponent_: TRootData

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

        this.rootEntity_ = this.registry_.createEntity()
        this.rootComponent_ = this.container_.get(RootComponent)

        this.registry_.getComponents(this.rootEntity_).add(this.rootComponent_)

        for (const System of Array.from(new Set(metadata.Systems)).sort(compareSystems)) {
            this.registry_.registerSystem(System)
        }
    }

    get registry() {
        return this.registry_
    }

    get rootEntity() {
        return this.rootEntity_
    }

    get rootComponent() {
        return this.rootComponent_
    }

    start() {
        if (!this.running_) {
            this.running_ = true
            this.animationFrameCallback_()
        }
    }

    stop() {
        if (this.running_) {
            this.running_ = false
            global.cancelAnimationFrame(this.requestAnimationFrameId_)
        }
    }

    reset() {
        this.requestAnimationFrameId_ = 0
        this.running_ = false
        this.registry_.reset()
    }
}

export function createEngine<RootData extends TEngineData>(
    RootComponent: IOC.TConstructor<RootData>,
): IEngine<RootData> {
    return new Engine(RootComponent)
}
