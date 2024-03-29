import type {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    IReceiver,
    TDefaultEventMap,
    TEmitter,
    TEventKey,
    TEventMap,
} from "@nealrame/ts-events"

export type TConstructorsOf<T extends Array<unknown>> = {
    [K in keyof T]: TConstructor<T[K]>
}

export type TEntity = number

export interface IComponentContainer {
    add<T>(component: T): T
    add<T>(componentType: TConstructor<T>): T

    get<T>(componentType: TConstructor<T>): T
    getAll<T extends Array<unknown>>(...componentsType: TConstructorsOf<T>): T

    remove(componentType: TConstructor): void

    has(componentType: TConstructor): boolean
    hasAll(componentTypes: Iterable<TConstructor>): boolean
    hasOne(componentTypes: Iterable<TConstructor>): boolean
}

export interface IEntitySet {
    [Symbol.iterator](): IterableIterator<TEntity>

    all(): Iterable<TEntity>
    allReversed(): Iterable<TEntity>

    first(): TEntity | undefined
    last(): TEntity | undefined
}

export type TEntityQueryAggregate = Record<number | string | symbol, IEntityQuerySet>
export type TEntityQueryKeyMapper = (componentsContainer: IComponentContainer) => number | string | symbol
export type TEntityQueryPredicate = (componentsContainer: IComponentContainer) => boolean

export interface IEntityQuerySet extends IEntitySet {
    find(pred: TEntityQueryPredicate): TEntity | undefined
    filter(pred: TEntityQueryPredicate): IEntityQuerySet
    groupBy(key: TEntityQueryKeyMapper): TEntityQueryAggregate
    partition(pred: TEntityQueryPredicate): [IEntityQuerySet, IEntityQuerySet]
}

export type TSystemDefaultEventMap = TDefaultEventMap

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISystem<TEvents extends TEventMap = TSystemDefaultEventMap> {
    reset?(registry: IRegistry, emit: TEmitter<TEvents>): void
    start?(registry: IRegistry, emit: TEmitter<TEvents>): void
    stop?(registry: IRegistry, emit: TEmitter<TEvents>): void
    update?(registry: IRegistry, emit: TEmitter<TEvents>): void
}

export interface ISystemEventHandler<TEvents extends TEventMap = TSystemDefaultEventMap> {
    readonly emit: TEmitter<TEvents>
    readonly engine: IRegistry
}

export type TSystemEventHandlerMap<TEvents extends TEventMap = TSystemDefaultEventMap> = {
    [K in TEventKey<TEvents>]?: (
        this: ISystemEventHandler<TEvents>,
        value: TEvents[K],
    ) => void
}

export interface ISystemOptions {
    entities?: TEntityQueryPredicate
    priority?: number
}

export interface IRegistry {
    createEntity(...componentTypes: Array<TConstructor>): TEntity
    createEntities(count: number, ...componentTypes: Array<TConstructor>): Array<TEntity>

    hasEntity(entity: TEntity): boolean

    getEntityComponents(entity: TEntity): IComponentContainer

    removeEntity(entity: TEntity): void
    removeEntities(entities: Iterable<TEntity>): void
    removeAllEntities(): void

    readonly entities: IEntityQuerySet
    filterEntities(predicate: TEntityQueryPredicate): IEntityQuerySet
    getSystemEntities(System: ISystem): IEntityQuerySet

    registerSystem(System: TConstructor<ISystem>): ISystem
}

export type TEngineOptions = {
    Systems?: Array<TConstructor<ISystem> >
}

export type TEngineSystemEventMap<TEvents extends TDefaultEventMap = TDefaultEventMap> = {
    [K in TEventKey<TEvents>]?: string
}

export type TEngineMetadata = {
    Systems: Map<TConstructor<ISystem>, TEngineSystemEventMap>
}

export interface IEngine {
    readonly registry: IRegistry,

    start(): IEngine
    stop(): IEngine
    reset(): IEngine

    events<TEvents extends TEventMap>(System: TConstructor<ISystem<TEvents>>): IReceiver<TEvents>
}
