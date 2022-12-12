import "reflect-metadata"

import * as IOC from "@nealrame/ts-injector"

import {
    type IReceiver,
    type TEmitter,
    type TEventMap,
    useEvents,
} from "@nealrame/ts-events"

import {
    ComponentContainer,
} from "./component"

import {
    GameMetadataKey,
    SystemMetadataKey,
} from "./constants"

import {
    type ISystemMetadata,
    getSystemPriority,
} from "./decorators/system"

import {
    EntityQuerySet,
} from "./queryset"

import type {
    IGameMetadata,
    IEntityFactory,
    IComponentContainer,
    IRegistry,
    IEntityQuerySet,
    ISystem,
    TEntity,
    TEntityQueryPredicate,
} from "./types"

function compareSystems(
    SystemA: IOC.TConstructor<ISystem>,
    SystemB: IOC.TConstructor<ISystem>,
): number {
    return getSystemPriority(SystemA) - getSystemPriority(SystemB)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function *getSystemEventHooks(target: any) {
    const prototype = Object.getPrototypeOf(target)
    for (const propName of Object.getOwnPropertyNames(prototype)) {
        const prop = Reflect.get(prototype, propName)
        if (typeof prop === "function") {
            yield [propName, prop]
        }
    }
}

function connectSystemEvents(
    system: ISystem,
    engine: IRegistry,
): [TEmitter, IReceiver] {
    const [emit, receiver] = useEvents()
    const { events } = Reflect.getMetadata(
        SystemMetadataKey,
        system.constructor,
    ) as ISystemMetadata

    const eventHandlers = Object.create(events, {
        emit: { value: emit },
        engine: { value: engine },
    })

    for (const [name, handler] of getSystemEventHooks(eventHandlers)) {
        receiver.on(name, handler.bind(eventHandlers))
    }

    return [emit, receiver]
}

export class Registry implements IRegistry {
    private frame_ = 0

    private entities_: Map<TEntity, ComponentContainer> = new Map()

    private systemsEntities_: Map<ISystem, Set<TEntity>> = new Map()
    private systemsEvents_: Map<ISystem, [TEmitter, IReceiver]> = new Map()
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

    private *systems_(): Iterable<[ISystem, TEmitter]> {
        for (const system of this.systemsQueue_) {
            // By construction systemsEvents_ has a value for system. So we can
            // safely use the non-null assertion operator.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [emit] = this.systemsEvents_.get(system)!
            yield [system, emit]
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
            this.systemsEvents_.set(system, connectSystemEvents(system, this))
            this.systemsQueue_.push(system)
        }
    }

    public get frame(): number {
        return this.frame_
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

    public getComponents(entity: TEntity)
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

    public getEntities(): IEntityQuerySet
    public getEntities(System: ISystem): IEntityQuerySet
    public getEntities(predicate: TEntityQueryPredicate): IEntityQuerySet
    public getEntities(arg?: unknown): IEntityQuerySet {
        if (typeof arg === "function") {
            // Predicate query
            const predicate = arg as TEntityQueryPredicate
            return new EntityQuerySet(this, this.entities_.keys(), predicate)
        }

        if (arg != null) {
            // System query
            const system = arg as ISystem
            const entities = this.systemsEntities_.get(system) ?? new Set<TEntity>()
            return new EntityQuerySet(this, entities)
        }

        // All entities query
        return new EntityQuerySet(this, this.entities_.keys())
    }

    public reset() {
        for (const [system, emit] of this.systems_()) {
            system.reset?.(this, emit)
        }
        this.frame_ = 0
    }

    public update() {
        for (const [system, emit] of this.systems_()) {
            system.update?.(this, emit)
        }
        // this.removePostponedEntities_()
        this.frame_ = this.frame_ + 1
    }

    public events<TEvents extends TEventMap>(
        System: IOC.TConstructor<ISystem<TEvents>>
    ): IReceiver<TEvents> {
        const [, receiver] = this.systemsEvents_.get(this.container_.get(System)) ?? [null, null]
        if (receiver == null) {
            throw new Error(`System ${System.name} does not exist`)
        }
        return receiver as IReceiver<TEvents>
    }
}

export function createRegistry(
    Game: IOC.TConstructor,
    container?: IOC.Container,
): IRegistry {
    const {
        entityFactory,
        systems,
    } = Reflect.getMetadata(GameMetadataKey, Game) as IGameMetadata

    const ensuredContainer = container ?? new IOC.Container()

    const engine = new Registry(
        ensuredContainer,
        entityFactory,
        systems,
    )

    return engine
}
