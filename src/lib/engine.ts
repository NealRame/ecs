import * as IOC from "@nealrame/ts-injector"
import { Container, Inject } from "@nealrame/ts-injector"

import {
    type IReceiver,
    type TEmitter,
} from "@nealrame/ts-events"

import {
    EntityFactory,
    RootComponentKey,
    RootEntityKey,
} from "./constants"

import {
    getEngineMetadata,
    getSystemPriority,
    System,
} from "./decorators"

import {
    BasicEntityFactory,
} from "./entity"

import {
    Registry,
} from "./registry"

import type {
    IEngine,
    ISystem,
    TEngineData,
} from "./types"

function compareSystems(
    SystemA: IOC.TConstructor<ISystem>,
    SystemB: IOC.TConstructor<ISystem>,
): number {
    return getSystemPriority(SystemA) - getSystemPriority(SystemB)
}

export function createEngine<RootData extends TEngineData = TEngineData>(
    RootComponent: IOC.TConstructor<RootData>,
): IEngine<RootData> {
    let requestAnimationFrameId = 0

    const container = new IOC.Container()

    const metadata = getEngineMetadata(RootComponent)

    container.set(EntityFactory, metadata.EntityFactory || BasicEntityFactory)

    const registry = container.get(Registry)
    const rootEntity = registry.createEntity()
    const rootComponent = container.get(RootComponentKey) as RootData

    const animationFrameCallback = () => {
        if (rootComponent.running) {
            registry.update()
            rootComponent.frame += 1
            requestAnimationFrameId =
                global.requestAnimationFrame(animationFrameCallback)
        }
    }

    registry.getComponents(rootEntity).add(rootComponent)
    for (const System of Array.from(new Set(metadata.Systems)).sort(compareSystems)) {
        registry.registerSystem(System)
    }

    return {
        get rootEntity() {
            return rootEntity
        },
        get rootComponent() {
            return rootComponent
        },
        get registry() {
            return registry
        },
        start() {
            if (!rootComponent.running) {
                rootComponent.running = true
                requestAnimationFrameId =
                    global.requestAnimationFrame(animationFrameCallback)
            }
        },
        stop() {
            if (rootComponent.running) {
                rootComponent.running = false
                global.cancelAnimationFrame(requestAnimationFrameId)
            }
        },
        reset() {
            requestAnimationFrameId = 0
            rootComponent.frame = 0
            rootComponent.running = false
            registry.reset()
        }
    }
}
