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

export interface IEntityFactory {
    create(): TEntity
    createMultiple(count: number): Array<TEntity>
}

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

export type TEntityQueryPredicate = (componentsContainer: IComponentContainer) => boolean

export interface IEntityQuerySet {
    [Symbol.iterator](): Iterator<TEntity>

    filter(pred: TEntityQueryPredicate): IEntityQuerySet

    find(pred: TEntityQueryPredicate): TEntity | undefined
    partition(pred: TEntityQueryPredicate): [Set<TEntity>, Set<TEntity>]
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

export interface ISystemOptions<TEvents extends TEventMap = TSystemDefaultEventMap> {
    entities?: TEntityQueryPredicate
    events?: TSystemEventHandlerMap<TEvents>
    priority?: number
}

export interface IRegistry {
    createEntity(...componentTypes: Array<TConstructor>): TEntity
    createEntities(count: number, ...componentTypes: Array<TConstructor>): Array<TEntity>

    hasEntity(entity: TEntity): boolean
    getComponents(entity: TEntity): IComponentContainer

    readonly entities: IEntityQuerySet
    filterEntities(predicate: TEntityQueryPredicate): IEntityQuerySet
    getSystemEntities(System: ISystem): IEntityQuerySet

    registerSystem(System: TConstructor<ISystem>): ISystem
}

export type TEngineMetadata = {
    EntityFactory: IEntityFactory
    Systems: Array<TConstructor<ISystem>>
}

export type TEngineData = object

export interface IEngine {
    readonly registry: IRegistry,

    start(): IEngine
    stop(): IEngine
    reset(): IEngine

    events<TEvents extends TEventMap>(System: TConstructor<ISystem<TEvents>>): IReceiver<TEvents>
}
