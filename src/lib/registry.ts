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
} from "./queryset"

import type {
    IEntityFactory,
    IComponentContainer,
    IRegistry,
    IEntityQuerySet,
    ISystem,
    TEntity,
    TEntityQueryPredicate,
} from "./types"
import { Inject } from "@nealrame/ts-injector"

export class Registry implements IRegistry {
    private entities_: Map<TEntity, ComponentContainer> = new Map()
    private systemsEntities_: Map<ISystem, Set<TEntity>> = new Map()

    private registerEntity_(
        entity: TEntity,
        componentTypes: Array<IOC.TConstructor>,
    ): void {
        const components = new ComponentContainer(
            entity,
            this.container_,
            () => this.checkEntity_(entity),
        )
        this.entities_.set(entity, components)
        for (const componentType of componentTypes) {
            components.add(componentType)
        }
    }

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
        @Inject(IOC.Container) private container_: IOC.Container,
        @Inject(EntityFactory) private entityFactory_: IEntityFactory,
    ) { }

    // Entity management
    public createEntity(
        ...componentTypes: Array<IOC.TConstructor>
    ) {
        const entity = this.entityFactory_.create()
        this.registerEntity_(entity, componentTypes)
        return entity
    }

    public createEntities(
        count: number,
        ...componentTypes: Array<IOC.TConstructor>
    ) {
        const entities = this.entityFactory_.createMultiple(count)
        for (const entity of entities) {
            this.registerEntity_(entity, componentTypes)
        }
        return entities
    }

    public hasEntity(entity: TEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    public getComponents(entity: TEntity)
        : IComponentContainer {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }

    public get entities(): IEntityQuerySet {
        return new EntityQuerySet(this, this.entities_.keys())
    }

    public filterEntities(
        predicate: TEntityQueryPredicate,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.entities_.keys(), predicate)
    }

    public getSystemEntities(
        system: ISystem,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.systemsEntities_.get(system) ?? new Set<TEntity>())
    }

    public registerSystem(
        System: IOC.TConstructor<ISystem>,
    ): ISystem {
        const system = this.container_.get(System)
        if (!this.systemsEntities_.has(system)) {
            this.systemsEntities_.set(system, new Set<TEntity>())
        }
        return system
    }
}
