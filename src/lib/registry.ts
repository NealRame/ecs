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
    EntityFactory,
    SystemMetadataKey,
} from "./constants"

import {
    type ISystemMetadata,
} from "./decorators/system"

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
    private entities_: Map<TEntity, ComponentContainer> = new Map()

    private frame_ = 0

    private systemsEntities_: Map<ISystem, Set<TEntity>> = new Map()
    private systemsEvents_: Map<ISystem, [TEmitter, IReceiver]> = new Map()
    private systemsQueue_: Array<ISystem> = []

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
        @Inject(IOC.Container) private container_: IOC.Container,
        @Inject(EntityFactory) private entityFactory_: IEntityFactory,
    ) { }

    public get frame(): number {
        return this.frame_
    }

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

    public getEntitiesFilterBy(
        predicate: TEntityQueryPredicate,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.entities_.keys(), predicate)
    }

    public getEntitiesOfSystem(
        system: ISystem,
    ): IEntityQuerySet {
        return new EntityQuerySet(this, this.systemsEntities_.get(system) ?? new Set<TEntity>())
    }

    public get systems()
        : Iterable<ISystem> {
        return this.systemsQueue_[Symbol.iterator]()
    }

    public registerSystem(
        System: IOC.TConstructor<ISystem>,
    ): ISystem {
        const system = this.container_.get(System)
        if (!this.systemsEntities_.has(system)) {
            this.systemsEntities_.set(system, new Set<TEntity>())
            this.systemsEvents_.set(system, connectSystemEvents(system, this))
            this.systemsQueue_.push(system)
        }
        return system
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

    public reset() {
        this.entities_.clear()
        for (const entities of this.systemsEntities_.values()) {
            entities.clear()
        }
        for (const [system, emit] of this.systems_()) {
            system.reset?.(this, emit)
        }
    }

    public update() {
        for (const [system, emit] of this.systems_()) {
            system.update?.(this, emit)
        }
        // this.removePostponedEntities_()
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
