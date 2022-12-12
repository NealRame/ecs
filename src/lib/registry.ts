import {
    type TEmitter,
    type IReceiver,
    useEvents,
} from "@nealrame/ts-events"

import {
    type TConstructor,
    Container,
    Inject,
    Service,
    ServiceLifecycle,
} from "@nealrame/ts-injector"

import {
    ComponentContainer,
} from "./component"

import {
    EntityFactory,
} from "./constants"

import * as query from "./query"

import {
    EntityQuerySet,
} from "./queryset"

import type {
    IComponentContainer,
    IEntityFactory,
    IEntityQuerySet,
    IRegistry,
    TEntity,
    TEntityQueryPredicate,
    TSystemConfig,
    TSystemDelegates,
    TSystemIdentifier,
} from "./types"

type TSystem = {
    delegates: TSystemDelegates
    entities: Set<TEntity>
    emit: TEmitter
    events: IReceiver
    predicate: TEntityQueryPredicate
    priority: number
}

export class Registry implements IRegistry {
    private entities_ = new Map<TEntity, ComponentContainer>()

    private systems_ = new Map<TSystemIdentifier, TSystem>()
    private systemsQueue_: Array<TSystemIdentifier> = []

    public checkEntity_(entity: TEntity) {
        for (const system of this.systems_.values()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(
        entity: TEntity,
        system: TSystem,
    ) {
        const components = this.entities_.get(entity)
        if (components != null) {
            const { entities, predicate } = system
            if (predicate(components)) {
                entities.add(entity)
            } else {
                entities.delete(entity)
            }
        }
    }

    private registerEntity_(
        entity: TEntity,
        Components: Array<TConstructor>,
    ) {
        const components = new ComponentContainer(
            entity,
            this.container_,
            () => this.checkEntity_(entity),
        )
        this.entities_.set(entity, components)
        for (const Component of Components) {
            components.add(Component)
        }
    }

    private *orderedSystems_() {
        for (const systemId of this.systemsQueue_) {
            // By construction, if a system is in the queue, it must exist in
            // the systems map so we can safely use the non-null assertion
            // operator.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            yield this.systems_.get(systemId)!
        }
    }

    constructor(
        private container_: Container,
        private entityFactory_: IEntityFactory
    ) {}

    public async createEntity(
        ...Components: Array<TConstructor>
    ) {
        const entity = await this.entityFactory_.create()
        this.registerEntity_(entity, Components)
        return entity
    }

    public async createMultitpleEntities(
        count: number,
        ...Components: Array<TConstructor>
    ) {
        const entities = await this.entityFactory_.createMultiple(count)
        for (const entity of entities) {
            this.registerEntity_(entity, Components)
        }
        return entities
    }

    public hasEntity(entity: TEntity): boolean {
        return this.entities_.has(entity)
    }

    public getEntities(): IEntityQuerySet
    public getEntities(predicate: TEntityQueryPredicate): IEntityQuerySet
    public getEntities(system: TSystemIdentifier): IEntityQuerySet
    public getEntities(arg?: unknown): IEntityQuerySet {
        if (typeof arg === "function") {
            // Predicate query
            const predicate = arg as TEntityQueryPredicate
            const entities = new Set<TEntity>()
            return new EntityQuerySet(this, entities, predicate)
        }

        if (arg != null) {
            // System query
            const system = this.systems_.get(arg as TSystemIdentifier)
            const entities = system?.entities ?? new Set<TEntity>()
            return new EntityQuerySet(this, entities)
        }

        // All entities query
        return new EntityQuerySet(this, this.entities_.keys())
    }

    public getComponents(entity: TEntity)
        : IComponentContainer {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }

    public registerSystem(config: TSystemConfig) {
        if (this.systems_.has(config.name)) return
        const [emit, events] = useEvents()
        const delegates = config.setup(this)
        const entities = new Set<TEntity>()
        const predicate = config.predicate ?? query.All
        const priority = config.priority ?? 0

        this.systems_.set(config.name, {
            delegates,
            entities,
            emit,
            events,
            predicate,
            priority,
        })

        const index = this.systemsQueue_.findIndex(systemId => {
            // By construction, if a system is in the queue, it must exist in
            // the systems map so we can safely use the non-null assertion
            // operator.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const { priority: systemPriority } = this.systems_.get(systemId)!
            return priority < systemPriority
        })

        if (index === -1) {
            this.systemsQueue_.push(config.name)
        } else {
            this.systemsQueue_.splice(index, 0, config.name)
        }
    }

    public reset(): void {
        this.entities_.clear()
        for (const { delegates } of this.orderedSystems_()) {
            delegates.reset?.()
        }
    }

    public update(): void {
        // Update all systems
        for (const { delegates, entities } of this.orderedSystems_()) {
            delegates.update?.(entities)
        }
    }
}

export function createRegistry(
    container: Container,
    entityFactory: IEntityFactory,
    systems: Array<TSystemConfig>,
): IRegistry {
    const registry = new Registry(container, entityFactory)
    for (const system of systems) {
        registry.registerSystem(system)
    }
    return registry
}
