import type {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    IEmitter,
    IReceiver,
    EventMap,
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

export type IEntityQueryPredicate = (componentsContainer: IComponentContainer) => boolean

export interface IEntityQuerySet {
    [Symbol.iterator](): Iterator<TEntity>

    find(pred: IEntityQueryPredicate): TEntity | undefined
    filter(pred: IEntityQueryPredicate): Set<TEntity>
    partition(pred: IEntityQueryPredicate): [Set<TEntity>, Set<TEntity>]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISystem<Events extends EventMap = Record<string, any>> {
    readonly emitter: IEmitter<Events>
    readonly events: IReceiver<Events>
    update(entities: Set<TEntity>, ecs: IEngine): void
}

export interface IEngine {
    readonly frame: number

    update(): IEngine

    createEntity(): Promise<TEntity>
    createEntities(count: number): Promise<Array<TEntity>>
    hasEntity(entity: TEntity): boolean
    getEntityComponents(entity: TEntity): IComponentContainer

    addSystem(system: ISystem): IEngine
    removeSystem(system: ISystem): IEngine

    query(system?: ISystem): IEntityQuerySet
}
