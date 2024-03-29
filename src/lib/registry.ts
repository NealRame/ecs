import "reflect-metadata"

import * as IOC from "@nealrame/ts-injector"

import {
    ComponentContainer,
} from "./component"

import {
    getSystemEntitiesPredicate,
} from "./decorators/system"

import {
    EntitySet,
} from "./entityset"

import {
    EntityQuerySet,
} from "./queryset"

import type {
    IComponentContainer,
    IRegistry,
    IEntityQuerySet,
    ISystem,
    TEntity,
    TEntityQueryPredicate,
} from "./types"

export class Registry implements IRegistry {
    private container_: IOC.Container

    private nextEntityId_ = 0

    private entities_: EntitySet = new EntitySet()
    private componentsMap_: Map<TEntity, ComponentContainer> = new Map()
    private systemsEntities_: Map<ISystem, EntitySet> = new Map()

    private registerEntity_(
        entity: TEntity,
        componentTypes: Array<IOC.TConstructor>,
    ): void {
        const components = new ComponentContainer(
            entity,
            this.container_,
            () => this.checkEntity_(entity),
        )
        this.entities_.add(entity)
        this.componentsMap_.set(entity, components)
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
        const components = this.componentsMap_.get(entity)
        const systemEntities = this.systemsEntities_.get(system)
        if (components != null && systemEntities != null) {
            const predicate = getSystemEntitiesPredicate(system)
            if (predicate(components)) {
                systemEntities.add(entity)
            } else {
                systemEntities.delete(entity)
            }
        }
    }

    constructor() {
        this.container_ = new IOC.Container()
    }

    // Entity management
    public createEntity(
        ...componentTypes: Array<IOC.TConstructor>
    ) {
        const entity = this.nextEntityId_++
        this.registerEntity_(entity, componentTypes)
        return entity
    }

    public createEntities(
        count: number,
        ...componentTypes: Array<IOC.TConstructor>
    ) {
        return Array.from(
            { length: count },
            () => this.createEntity(...componentTypes)
        )
    }

    public removeEntity(entity: TEntity) {
        if (this.hasEntity(entity)) {
            this.componentsMap_.delete(entity)
            this.entities_.delete(entity)
            for (const entities of this.systemsEntities_.values()) {
                entities.delete(entity)
            }
        }
    }

    public removeEntities(
        entities: Iterable<TEntity>,
    ) {
        for (const entity of entities) {
            this.removeEntity(entity)
        }
    }

    public removeAllEntities() {
        this.entities_.clear()
        this.componentsMap_.clear()
        for (const [, systemEntities] of this.systemsEntities_) {
            systemEntities.clear()
        }
    }

    public hasEntity(entity: TEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    public getEntityComponents(entity: TEntity)
        : IComponentContainer {
        const components = this.componentsMap_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }

    public get entities(): IEntityQuerySet {
        return new EntityQuerySet(this, this.entities_)
    }

    public filterEntities(
        predicate: TEntityQueryPredicate,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.entities_, predicate)
    }

    public getSystemEntities(
        system: ISystem,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.systemsEntities_.get(system) ?? new EntitySet())
    }

    public registerSystem(
        System: IOC.TConstructor<ISystem>,
    ): ISystem {
        const system = this.container_.get(System)
        if (!this.systemsEntities_.has(system)) {
            this.systemsEntities_.set(system, new EntitySet())
        }
        return system
    }
}
