import * as IOC from "@nealrame/ts-injector"

type IEntity = number

interface IECS {
    readonly frame: number

    createEntity(): Promise<IEntity>
    createEntities(count: number): Promise<Array<IEntity>>
    hasEntity(entity: IEntity): boolean

    update(): IECS
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

@IOC.Service({
    lifecycle: IOC.ServiceLifecycle.Singleton,
})
export class ECS implements IECS {
    private entities_: Map<IEntity, []>

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

    async createEntity() {
        const entity = await this.entityFactory_.create()
        this.entities_.set(entity, [])
        return entity
    }

    async createEntities(count: number) {
        const entities = await this.entityFactory_.bulkCreate(count)
        for (const entity of entities) {
            this.entities_.set(entity, [])
        }
        return entities
    }

    hasEntity(entity: IEntity)
        : boolean {
        return this.entities_.has(entity)
    }

    update()
        : IECS {
        throw new Error("Method not implemented.")
        return this
    }
}
