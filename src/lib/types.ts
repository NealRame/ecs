import {
    TConstructor,
} from "@nealrame/ts-injector"

export type TConstructorsOf<T extends Array<unknown>> = {
    [K in keyof T]: TConstructor<T[K]>
}

export type TEntity = number

export interface IEntityFactory {
    create(): Promise<TEntity>
    createMultiple(count: number): Promise<Array<TEntity>>
}

export interface IComponentContainer {
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

export type TSystemIdentifier = string | symbol

export type TSystemDelegates = {
    reset?: () => void,
    update?: (entities: Set<TEntity>) => void,
}

export type TSystemConfig = {
    predicate?: TEntityQueryPredicate
    priority?: number
    name: TSystemIdentifier
    setup: (registry: IRegistry) => TSystemDelegates
}

export interface IRegistry {
    createEntity(...Components: Array<TConstructor>): Promise<TEntity>
    createMultitpleEntities(count: number, ...Components: Array<TConstructor>): Promise<Array<TEntity>>

    getComponents(entity: TEntity): IComponentContainer

    getEntities(): IEntityQuerySet
    getEntities(predicate: TEntityQueryPredicate): IEntityQuerySet
    getEntities(system: TSystemIdentifier): IEntityQuerySet

    hasEntity(entity: TEntity): boolean

    registerSystem(config: TSystemConfig): void

    reset(): void
    update(): void
}
