import type {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    TDefaultEventMap,
    TEmitter,
    TEventKey,
    TEventMap,
} from "@nealrame/ts-events"

export type MapTConstructor<T extends Array<unknown>> = {
    [K in keyof T]: TConstructor<T[K]>
}

export type TEntity = number

export interface IEntityFactory {
    create(): Promise<TEntity>
    bulkCreate(count: number): Promise<Array<TEntity>>
}

export interface IComponentContainer {
    add<T>(componentType: TConstructor<T>): T

    get<T>(componentType: TConstructor<T>): T
    getAll<T extends Array<unknown>>(...componentsType: MapTConstructor<T>): T

    remove(componentType: TConstructor): void

    has(componentType: TConstructor): boolean
    hasAll(componentTypes: Iterable<TConstructor>): boolean
    hasOne(componentTypes: Iterable<TConstructor>): boolean
}

export type TEntityQueryPredicate = (componentsContainer: IComponentContainer) => boolean

export interface IEntityQuerySet {
    [Symbol.iterator](): Iterator<TEntity>

    find(pred: TEntityQueryPredicate): TEntity | undefined
    filter(pred: TEntityQueryPredicate): Set<TEntity>
    partition(pred: TEntityQueryPredicate): [Set<TEntity>, Set<TEntity>]
}

export type TSystemDefaultEventMap = TDefaultEventMap

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISystem<TEvents extends TEventMap = TSystemDefaultEventMap> {
    update(
        entities: Set<TEntity>,
        engine: IEngine,
        emit: TEmitter<TEvents>,
    ): void
}

export interface ISystemEventHandler<TEvents extends TEventMap = TSystemDefaultEventMap> {
    readonly emit: TEmitter<TEvents>
    readonly engine: IEngine
}

export type TSystemEventHandlerMap<TEvents extends TEventMap = TSystemDefaultEventMap> = {
    [K in TEventKey<TEvents>]?: (
        this: ISystemEventHandler<TEvents>,
        value: TEvents[K],
    ) => void
}

export interface ISystemOptions<TEvents extends TEventMap = TSystemDefaultEventMap> {
    entities?: TEntityQueryPredicate
    events?: TSystemEventHandlerMap<TEvents>
    priority?: number
}

export interface IEngine {
    readonly frame: number
    readonly mode: GameMode

    createEntity(...componentTypes: Array<TConstructor>): Promise<TEntity>
    createEntities(count: number): Promise<Array<TEntity>>
    hasEntity(entity: TEntity): boolean
    getEntityComponents(entity: TEntity): IComponentContainer

    hasSystem(system: TConstructor<ISystem>): boolean
    getSystem(System: TConstructor<ISystem>): ISystem

    queryEntities(System?: TConstructor<ISystem>): IEntityQuerySet

    start(): IEngine
    stop(): IEngine

    update(): IEngine
}

export type IGameMetadata = {
    entityFactory: IEntityFactory
    systems: Array<TConstructor<ISystem>>
}

export enum GameMode {
    Paused = 0,
    Running = 1,
    Stopped = 2,
}
