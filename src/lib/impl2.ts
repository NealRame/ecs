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
    getAll<T extends Array<unknown>>(componentsType: MapTConstructor<T>): T

    remove(componentType: IOC.TConstructor): void

    has(componentType: IOC.TConstructor): boolean
    hasAll(componentTypes: Iterable<IOC.TConstructor>): boolean
    hasOne(componentTypes: Iterable<IOC.TConstructor>): boolean
}

type ISystemEventEmitterReceiver<Events extends EventMap = Record<string, any>> = [
    IEmitter<Events>,
    IReceiver<Events>
]

export type ISystemAcceptCallback = (componentsContainer: IComponentContainer) => boolean

export interface ISystemUpdateContext<Events extends EventMap = Record<string, any>> {
    ecs: IECS
    emitter: IEmitter<Events>
}

export abstract class System<Events extends EventMap = Record<string, any>> {
    abstract accept: ISystemAcceptCallback
    abstract update(entities: Set<IEntity>, context: ISystemUpdateContext<Events>): void
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
        componentsType: MapTConstructor<T>
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

@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class ECS implements IECS {
    private frame_ = 0
    private entities_: Map<IEntity, ComponentContainer> = new Map()
    private systems_: Map<System, [...ISystemEventEmitterReceiver, Set<IEntity>]> = new Map()

    private checkEntity_(entity: IEntity) {
        for (const system of this.systems_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(
        entity: IEntity,
        system: System,
    ) {
        const components = this.entities_.get(entity)
        if (components != null) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [, , entities] = this.systems_.get(system)!
            if (system.accept(components)) {
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
        for (const [system, [emitter, , entities]] of this.systems_.entries()) {
            system.update(entities, {
                ecs: this,
                emitter,
            })
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
        system: System
    ): IECS {
        this.systems_.set(system, [...useEvents(), new Set<IEntity>()])
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
        return this
    }

    public removeSystem(
        system: System
    ): IECS {
        this.systems_.delete(system)
        return this
    }

    public events<Events extends EventMap>(
        system: System<Events>,
    ): IReceiver<Events> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!this.systems_.has(system)) {
            throw new Error("System is not registered")
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [, receiver] = this.systems_.get(system)!
        return receiver as IReceiver<Events>
    }
}
