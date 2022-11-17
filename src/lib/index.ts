import "reflect-metadata"

import * as IOC from "@nealrame/ts-injector"

import {
    type EventMap,
    type IEmitter,
    type IReceiver,
    useEvents,
} from "@nealrame/ts-events"

export type IEntity = number

export interface IComponentContainer {
    add<T>(componentType: IOC.TConstructor<T>): T

    get<T>(componentType: IOC.TConstructor<T>): T
    getAll<T extends Array<unknown>>(...componentsType: MapTConstructor<T>): T

    remove(componentType: IOC.TConstructor): void

    has(componentType: IOC.TConstructor): boolean
    hasAll(componentTypes: Iterable<IOC.TConstructor>): boolean
    hasOne(componentTypes: Iterable<IOC.TConstructor>): boolean
}

export type ISystemEventEmitterReceiver<Events extends EventMap = Record<string, any>> = [
    IEmitter<Events>,
    IReceiver<Events>
]

export type IEntityQueryPredicate = (componentsContainer: IComponentContainer) => boolean

export interface IEntityQuerySet {
    [Symbol.iterator](): Iterator<IEntity>

    find(pred: IEntityQueryPredicate): IEntity | undefined
    filter(pred: IEntityQueryPredicate): Set<IEntity>
    partition(pred: IEntityQueryPredicate): [Set<IEntity>, Set<IEntity>]
}

class EntityQuerySet {
    constructor(
        private ecs_: IECS,
        private entities_: Iterable<IEntity>,
    ) { }

    *[Symbol.iterator]() {
        for (const entity of this.entities_) {
            yield entity
        }
    }

    find(
        pred: IEntityQueryPredicate
    ): IEntity | undefined {
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                return entity
            }
        }
    }

    filter(
        pred: IEntityQueryPredicate
    ): Set<IEntity> {
        const filtered = new Set<IEntity>()
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                filtered.add(entity)
            }
        }
        return filtered
    }

    partition(
        pred: IEntityQueryPredicate
    ): [Set<IEntity>, Set<IEntity>] {
        const [filtered, rejected] = [new Set<IEntity>(), new Set<IEntity>()]
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                filtered.add(entity)
            } else {
                rejected.add(entity)
            }
        }
        return [filtered, rejected]
    }
}


export function QueryAll(): boolean {
    return true
}

export function QueryNone(): boolean {
    return false
}

export function QueryAnd(
    ...predicates: Array<IEntityQueryPredicate>
): IEntityQueryPredicate {
    return componentsContainer => predicates.every(pred => pred(componentsContainer))
}

export function QueryOr(
    ...predicates: Array<IEntityQueryPredicate>
): IEntityQueryPredicate {
    return componentsContainer => predicates.some(pred => pred(componentsContainer))
}

export function QueryHasAll(
    ...componentTypes: Array<IOC.TConstructor>
): IEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasAll(componentTypes)
}

export function QueryHasOne(
    ...componentTypes: Array<IOC.TConstructor>
): IEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasOne(componentTypes)
}

export interface ISystemUpdateContext<Events extends EventMap = Record<string, any>> {
    ecs: IECS
}

export abstract class SystemBase<Events extends EventMap = Record<string, any>> {
    constructor() {
        [this.emitter, this.events] = useEvents<Events>()
    }

    public readonly emitter: IEmitter<Events>
    public readonly events: IReceiver<Events>

    public abstract update(entities: Set<IEntity>, ecs: IECS): void
}

class ComponentContainer {
    // eslint-disable-next-line @typescript-eslint/ban-types
    private components_ = new Map<Function, unknown>()

    constructor(
        private entity_: IEntity,
        private container_: IOC.Container,
        private updateComponentsCallback_: () => void,
    ) {}

    public get<T>(componentType: IOC.TConstructor<T>): T {
        const component = this.components_.get(componentType)
        if (component == null) {
            throw new Error(`Entity ${this.entity_} does not have component ${componentType.name}`)
        }
        return component as T
    }

    public getAll<T extends Array<unknown>>(
        ...componentsType: MapTConstructor<T>
    ): T {
        return componentsType.map(componentsType => this.get(componentsType)) as T
    }

    public add<T>(component: IOC.TConstructor<T>): T {
        const componentInstance = this.container_.get(component)
        this.components_.set(component, componentInstance)
        this.updateComponentsCallback_()
        return componentInstance
    }

    public remove(componentType: IOC.TConstructor): void {
        this.components_.delete(componentType)
        this.updateComponentsCallback_()
    }

    public has(componentType: IOC.TConstructor): boolean {
        return this.components_.has(componentType)
    }

    public hasAll(componentTypes: Iterable<IOC.TConstructor>): boolean {
        for (const componentType of componentTypes) {
            if (!this.has(componentType)) {
                return false
            }
        }
        return true
    }

    public hasOne(componentTypes: Iterable<IOC.TConstructor>): boolean {
        for (const componentType of componentTypes) {
            if (this.has(componentType)) {
                return true
            }
        }
        return false
    }
}

type MapTConstructor<T extends Array<unknown>> = {
    [K in keyof T]: IOC.TConstructor<T[K]>
}

export interface IECS {
    readonly frame: number

    update(): IECS

    createEntity(): Promise<IEntity>
    createEntities(count: number): Promise<Array<IEntity>>
    hasEntity(entity: IEntity): boolean
    getEntityComponents(entity: IEntity): IComponentContainer

    addSystem(system: SystemBase): IECS
    removeSystem(system: SystemBase): IECS

    query(system?: SystemBase): IEntityQuerySet
}

interface IEntityFactory {
    create(): Promise<IEntity>
    bulkCreate(count: number): Promise<Array<IEntity>>
}

export function BasicEntityFactory(): IEntityFactory {
    let id = 0
    return {
        async create() {
            return id++
        },
        async bulkCreate(count: number) {
            const start = id
            id = id + count
            return Array.from({ length: count }, (_, i) => start + i)
        },
    }
}

export const EntityFactory: IOC.Token<IEntityFactory> = Symbol("Entity factory")

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Component()
    : ClassDecorator {
    return IOC.Service()
}

export const SystemMetadataKey = Symbol("System")

export type SystemMetadata = {
    predicate: IEntityQueryPredicate
}

export function System(metadata: Partial<SystemMetadata>) {
    return (target: IOC.TConstructor<SystemBase>) => {
        IOC.Service()(target)
        Reflect.defineMetadata(SystemMetadataKey, {
            predicate: QueryNone,
            ...metadata,
        }, target)
    }
}

@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class ECS implements IECS {
    private frame_ = 0
    private entities_: Map<IEntity, ComponentContainer> = new Map()
    private systems_: Map<SystemBase, Set<IEntity>> = new Map()

    private checkEntity_(entity: IEntity) {
        for (const system of this.systems_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(
        entity: IEntity,
        system: SystemBase,
    ) {
        const components = this.entities_.get(entity)
        if (components != null) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const entities = this.systems_.get(system)!
            const { predicate } = Reflect.getMetadata(SystemMetadataKey, system.constructor)
            if (predicate(components)) {
                entities.add(entity)
            } else {
                entities.delete(entity)
            }
        }
    }

    constructor(
        @IOC.Inject(IOC.Container)
        private container_: IOC.Container,
        @IOC.Inject(EntityFactory)
        private entityFactory_: IEntityFactory,
    ) {}

    public get frame() {
        return this.frame_
    }

    public update()
        : IECS {
        for (const [system, entities] of this.systems_.entries()) {
            system.update(entities, this)
        }

        // this.removePostponedEntities_()
        this.frame_ = this.frame_ + 1

        return this
    }

    // Entity management
    public async createEntity() {
        const entity = await this.entityFactory_.create()
        this.entities_.set(entity, new ComponentContainer(
            entity,
            this.container_,
            () => this.checkEntity_(entity),
        ))
        return entity
    }

    public async createEntities(count: number) {
        const entities = await this.entityFactory_.bulkCreate(count)
        for (const entity of entities) {
            this.entities_.set(entity, new ComponentContainer(
                entity,
                this.container_,
                () => this.checkEntity_(entity),
            ))
        }
        return entities
    }

    public hasEntity(entity: IEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    public getEntityComponents(entity: IEntity)
        : IComponentContainer {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }

    // System management
    public addSystem(
        system: SystemBase
    ): IECS {
        this.systems_.set(system, new Set<IEntity>())
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
        return this
    }

    public getSystem(system: SystemBase) {
        return this.systems_.get(system)
    }

    public removeSystem(
        system: SystemBase
    ): IECS {
        this.systems_.delete(system)
        return this
    }

    public query(
        system?: SystemBase
    ): IEntityQuerySet {
        return new EntityQuerySet(
            this,
            system == null
                ? this.entities_.keys()
                : this.systems_.get(system) ?? [] as Iterable<IEntity>
        )
    }
}
