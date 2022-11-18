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

export type IEntity = number

export interface IEntityFactory {
    create(): Promise<IEntity>
    bulkCreate(count: number): Promise<Array<IEntity>>
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
    [Symbol.iterator](): Iterator<IEntity>

    find(pred: IEntityQueryPredicate): IEntity | undefined
    filter(pred: IEntityQueryPredicate): Set<IEntity>
    partition(pred: IEntityQueryPredicate): [Set<IEntity>, Set<IEntity>]
}

export interface ISystem<Events extends EventMap = Record<string, any>> {
    readonly emitter: IEmitter<Events>
    readonly events: IReceiver<Events>
    update(entities: Set<IEntity>, ecs: IECS): void
}

export interface IECS {
    readonly frame: number

    update(): IECS

    createEntity(): Promise<IEntity>
    createEntities(count: number): Promise<Array<IEntity>>
    hasEntity(entity: IEntity): boolean
    getEntityComponents(entity: IEntity): IComponentContainer

    addSystem(system: ISystem): IECS
    removeSystem(system: ISystem): IECS

    query(system?: ISystem): IEntityQuerySet
}
