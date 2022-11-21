import "reflect-metadata"

import * as IOC from "@nealrame/ts-injector"

import {
    ComponentContainer,
} from "./component"

import {
    EntityFactory,
    SystemMetadataKey,
} from "./constants"

import {
    getSystems,
} from "./decorators/helpers"

import {
    EntityQuerySet,
} from "./query"

import type {
    TEntity,
    IEntityFactory,
    IComponentContainer,
    IEngine,
    IEntityQuerySet,
    ISystem,
} from "./types"


@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class Engine implements IEngine {
    private frame_ = 0
    private entities_: Map<TEntity, ComponentContainer> = new Map()
    private systems_: Map<ISystem, Set<TEntity>> = new Map()

    // System management
    private addSystem_(
        system: ISystem
    ): IEngine {
        this.systems_.set(system, new Set<TEntity>())
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
        return this
    }

    private checkEntity_(entity: TEntity) {
        for (const system of this.systems_.keys()) {
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
            const entities = this.systems_.get(system)!
            const { entities: predicate } = Reflect.getMetadata(SystemMetadataKey, system.constructor)
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
    ) {
        for (const SystemClass of getSystems()) {
            this.addSystem_(this.container_.get(SystemClass))
        }
    }

    public get frame() {
        return this.frame_
    }

    public update()
        : IEngine {
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
        if (!this.systems_.has(system)) {
            throw new Error(`System ${System.name} does not exist`)
        }
        return system
    }

    public hasSystem(
        System: IOC.TConstructor<ISystem>,
    ): boolean {
        return this.container_.has(System)
            && this.systems_.has(this.container_.get(System))
    }

    public queryEntities(
        System?: IOC.TConstructor<ISystem>,
    ): IEntityQuerySet {
        const system = System != null ? this.getSystem(System) : null
        return new EntityQuerySet(
            this,
            system == null
                ? this.entities_.keys()
                : this.systems_.get(system) ?? [] as Iterable<TEntity>
        )
    }

    public start(): IEngine {
        return this
    }

    public stop(): IEngine {
        return this
    }
}
