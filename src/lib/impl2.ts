import * as IOC from "@nealrame/ts-injector"

export type IEntity = number

class ComponentContainer {
    // eslint-disable-next-line @typescript-eslint/ban-types
    private components_ = new Map<Function, unknown>()

    constructor(
        private container_: IOC.Container,
    ) {}

    public get<T>(componentType: IOC.TConstructor<T>): T {
        const component = this.components_.get(componentType)
        if (component == null) {
            throw new Error(`Entity does not have component ${componentType.name}.`)
        }
        return component as T
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

    addComponent<T>(entity: IEntity, componentType: IOC.TConstructor<T>): T
    getComponent<T>(entity: IEntity, componentType: IOC.TConstructor<T>): T
    getComponents<T extends Array<unknown>>(entity: IEntity, ...components: MapTConstructor<T>): T
    hasComponent(entity: IEntity, component: IOC.TConstructor): boolean
    removeComponent(entity: IEntity, component: IOC.TConstructor): void
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
        this.entities_.set(entity, new ComponentContainer(this.container_))
        return entity
    }

    async createEntities(count: number) {
        const entities = await this.entityFactory_.bulkCreate(count)
        for (const entity of entities) {
            this.entities_.set(entity, new ComponentContainer(this.container_))
        }
        return entities
    }

    hasEntity(entity: IEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    // Components management
    addComponent<T>(
        entity: IEntity,
        componentType: IOC.TConstructor<T>,
    ): T {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components.add(componentType)
    }

    removeComponent(
        entity: IEntity,
        componentType: IOC.TConstructor,
    ): void {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        components.remove(componentType)
    }

    getComponent<T>(
        entity: IEntity,
        componentType: IOC.TConstructor<T>
    ): T {
        const componentsContainer = this.entities_.get(entity)
        if (componentsContainer == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return componentsContainer.get(componentType)
    }

    getComponents<T extends Array<unknown>>(
        entity: IEntity,
        ...componentsType: MapTConstructor<T>
    ): T {
        const componentsContainer = this.entities_.get(entity)
        if (componentsContainer == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return componentsType.map(componentsType => componentsContainer.get(componentsType)) as T
    }

    hasComponent(
        entity: IEntity,
        component: IOC.TConstructor,
    ): boolean {
        const components = this.entities_.get(entity)
        if (components == null) {
            throw new Error(`Entity ${entity} does not exist`)
        }
        return components.has(component)
    }
}
