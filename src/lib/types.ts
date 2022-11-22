import type {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    IReceiver,
    TEmitter,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISystem<Events extends TEventMap = Record<string, any>> {
    readonly emit: TEmitter<Events>
    readonly events: IReceiver<Events>
    update(entities: Set<TEntity>, ecs: IEngine): void
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
    entityFactory: () => IEntityFactory
    systems: Array<TConstructor<ISystem>>
}

export enum GameMode {
    Paused = 0,
    Running = 1,
    Stopped = 2,
}
