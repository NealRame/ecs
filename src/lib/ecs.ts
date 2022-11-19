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
    EntityQuerySet,
} from "./query"

import type {
    IEntity,
    IEntityFactory,
    IComponentContainer,
    IECS,
    IEntityQuerySet,
    ISystem,
} from "./types"


@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class ECS implements IECS {
    private frame_ = 0
    private entities_: Map<IEntity, ComponentContainer> = new Map()
    private systems_: Map<ISystem, Set<IEntity>> = new Map()

    private checkEntity_(entity: IEntity) {
        for (const system of this.systems_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(
        entity: IEntity,
        system: ISystem,
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
        system: ISystem
    ): IECS {
        this.systems_.set(system, new Set<IEntity>())
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
        return this
    }

    public getSystem(system: ISystem) {
        return this.systems_.get(system)
    }

    public removeSystem(
        system: ISystem
    ): IECS {
        this.systems_.delete(system)
        return this
    }

    public query(
        system?: ISystem
    ): IEntityQuerySet {
        return new EntityQuerySet(
            this,
            system == null
                ? this.entities_.keys()
                : this.systems_.get(system) ?? [] as Iterable<IEntity>
        )
    }
}
