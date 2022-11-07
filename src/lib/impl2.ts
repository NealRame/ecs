import * as DI from "@nealrame/ts-injector"

type IEntity = number

interface IECS {
    readonly frame: number

    addEntity(): IEntity
    hasEntity(entity: IEntity): boolean

    update(): IECS
}

interface IEntityFactory {
    create(): IEntity
}

export function BasicEntityFactory(): IEntityFactory {
    let id = 0
    return {
        create() {
            return id++
        },
    }
}

export const EntityFactory: DI.Token<IEntityFactory> = Symbol("Entity factory")

@DI.Service({
    lifecycle: DI.ServiceLifecycle.Singleton,
})
export class ECS implements IECS {
    private entities_: Map<IEntity, []>

    constructor(
        @DI.Inject(DI.Container)
        private container_: DI.Container,
        @DI.Inject(EntityFactory)
        private entityFactory_: IEntityFactory,
    ) {
        this.entities_ = new Map()
    }

    get frame() {
        return 0
    }

    addEntity()
        : IEntity {
        return this.entityFactory_.create()
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
