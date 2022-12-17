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
    update?(registry: IRegistry, emit: TEmitter<TEvents>): void
    reset?(registry: IRegistry, emit: TEmitter<TEvents>): void
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

    readonly entities: IEntityQuerySet
    getEntitiesFilterBy(predicate: TEntityQueryPredicate): IEntityQuerySet
    getEntitiesOfSystem(System: ISystem): IEntityQuerySet

    getComponents(entity: TEntity): IComponentContainer

    readonly systems: Iterable<ISystem>
    registerSystem(System: TConstructor<ISystem>): ISystem
    getSystem(System: TConstructor<ISystem>): ISystem
    hasSystem(System: TConstructor<ISystem>): boolean


    reset(): void
    update(): void

    events<TEvents extends TEventMap>(System: TConstructor<ISystem<TEvents>>): IReceiver<TEvents>
}

export type TEngineMetadata = {
    EntityFactory: IEntityFactory
    Systems: Array<TConstructor<ISystem>>
}

export type TEngineData = {
    frame: number
    running: boolean
}

export interface IEngine<RootData extends TEngineData = TEngineData> {
    readonly registry: IRegistry,
    readonly rootEntity: TEntity,
    readonly rootComponent: RootData,
    start(): void
    stop(): void
    reset(): void
}
