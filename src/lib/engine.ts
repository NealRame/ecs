import "reflect-metadata"

import * as IOC from "@nealrame/ts-injector"

import {
    ComponentContainer,
} from "./component"

import {
    SystemMetadataKey,
} from "./constants"

import {
    EntityQuerySet,
} from "./query"

import {
    TEntity,
    IEntityFactory,
    IComponentContainer,
    IEngine,
    IEntityQuerySet,
    ISystem,
    GameMode,
} from "./types"


function compareSystems(
    a: IOC.TConstructor<ISystem>,
    b: IOC.TConstructor<ISystem>,
): number {
    const aMetadata = Reflect.getMetadata(SystemMetadataKey, a)
    const bMetadata = Reflect.getMetadata(SystemMetadataKey, b)
    return aMetadata.priority - bMetadata.priority
}

@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class Engine implements IEngine {
    private frame_ = 0
    private mode_ = GameMode.Stopped

    private entities_: Map<TEntity, ComponentContainer> = new Map()

    private systemsEntities_: Map<ISystem, Set<TEntity>> = new Map()
    private systemsQueue_: Array<ISystem> = []

    private checkEntity_(entity: TEntity) {
        for (const system of this.systemsEntities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(
        entity: TEntity,
        system: ISystem,
    ) {
        const components = this.entities_.get(entity)
        if (components != null) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const entities = this.systemsEntities_.get(system)!
            const { entities: predicate } = Reflect.getMetadata(SystemMetadataKey, system.constructor)
            if (predicate(components)) {
                entities.add(entity)
            } else {
                entities.delete(entity)
            }
        }
    }

    constructor(
        private container_: IOC.Container,
        private entityFactory_: IEntityFactory,
        systems: Iterable<IOC.TConstructor<ISystem>>,
    ) {
        // Systems are updated in order of priority
        for (const System of Array.from(new Set(systems)).sort(compareSystems)) {
            const system = this.container_.get(System)
            this.systemsEntities_.set(system, new Set<TEntity>())
            this.systemsQueue_.push(system)
        }
    }

    public get mode(): GameMode {
        return this.mode_
    }

    public get frame(): number {
        return this.frame_
    }

    public update()
        : IEngine {
        for (const system of this.systemsQueue_) {
            // By construction systemsEntities_ has a value for system. So we
            // can use the non-null assertion operator here.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const systemsEntities = this.systemsEntities_.get(system)!
            system.update(systemsEntities, this)
        }

        // this.removePostponedEntities_()
        this.frame_ = this.frame_ + 1

        return this
    }

    // Entity management
    public async createEntity(...componentTypes: Array<IOC.TConstructor>) {
        const entity = await this.entityFactory_.create()
        const components = new ComponentContainer(
            entity,
            this.container_,
            () => this.checkEntity_(entity),
        )

        this.entities_.set(entity, components)

        for (const componentType of componentTypes) {
            components.add(componentType)
        }

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

    public hasEntity(entity: TEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    public getEntityComponents(entity: TEntity)
        : IComponentContainer {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }

    public getSystem(
        System: IOC.TConstructor<ISystem>,
    ): ISystem {
        const system = this.container_.get(System)
        if (!this.systemsEntities_.has(system)) {
            throw new Error(`System ${System.name} does not exist`)
        }
        return system
    }

    public hasSystem(
        System: IOC.TConstructor<ISystem>,
    ): boolean {
        return this.container_.has(System)
            && this.systemsEntities_.has(this.container_.get(System))
    }

    public queryEntities(
        System?: IOC.TConstructor<ISystem>,
    ): IEntityQuerySet {
        const system = System != null ? this.getSystem(System) : null
        return new EntityQuerySet(
            this,
            system == null
                ? this.entities_.keys()
                : this.systemsEntities_.get(system) ?? [] as Iterable<TEntity>
        )
    }

    public start(): IEngine {
        return this
    }

    public stop(): IEngine {
        return this
    }
}
