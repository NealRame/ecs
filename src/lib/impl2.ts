import * as IOC from "@nealrame/ts-injector"

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

class ComponentContainer {
    // eslint-disable-next-line @typescript-eslint/ban-types
    private components_ = new Map<Function, unknown>()

    constructor(
        private entity_: IEntity,
        private ecs_: ECS,
        private container_: IOC.Container,
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
        return componentInstance
    }

    public remove(componentType: IOC.TConstructor): void {
        this.components_.delete(componentType)
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
    private entities_: Map<IEntity, ComponentContainer>

    constructor(
        @IOC.Inject(IOC.Container)
        private container_: IOC.Container,
        @IOC.Inject(EntityFactory)
        private entityFactory_: IEntityFactory,
    ) {
        this.entities_ = new Map()
    }

    get frame() {
        return 0
    }

    update()
        : IECS {
        throw new Error("Method not implemented.")
        return this
    }

    // Entity management
    async createEntity() {
        const entity = await this.entityFactory_.create()
        this.entities_.set(entity, new ComponentContainer(entity, this, this.container_))
        return entity
    }

    async createEntities(count: number) {
        const entities = await this.entityFactory_.bulkCreate(count)
        for (const entity of entities) {
            this.entities_.set(entity, new ComponentContainer(entity, this, this.container_))
        }
        return entities
    }

    hasEntity(entity: IEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    getEntityComponents(entity: IEntity)
        : IComponentContainer {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components
    }
}
