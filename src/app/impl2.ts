import {
    EntityFactory,
    ECS,
    BasicEntityFactory,
} from "../lib/impl2"

import {
    Container,
} from "@nealrame/ts-injector"


(async function() {
    const container = new Container()
    container.set(EntityFactory, BasicEntityFactory())

    const ecs = container.get(ECS)

    console.log(await ecs.createEntity())
    console.log(await ecs.createEntity())
    console.log(await ecs.createEntity())

    console.log(await ecs.createEntities(10))
    console.log(await ecs.createEntity())

    console.log(ecs.hasEntity(10))
})()
