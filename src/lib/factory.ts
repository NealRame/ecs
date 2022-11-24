import "reflect-metadata"

import {
    type TConstructor,
    Container,
} from "@nealrame/ts-injector"

import {
    GameMetadataKey,
} from "./constants"

import {
    Engine,
} from "./engine"

import type {
    IEngine,
    IGameMetadata,
} from "./types"

export function createEngine(
    Game: TConstructor,
    container?: Container,
): IEngine {
    const {
        entityFactory,
        systems,
    } = Reflect.getMetadata(GameMetadataKey, Game) as IGameMetadata

    const engine = new Engine(
        container ?? new Container(),
        entityFactory,
        systems,
    )

    return engine
}
