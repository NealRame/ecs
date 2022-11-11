import {
    Component,
    EntityFactory,
    ECS,
    BasicEntityFactory,
} from "../lib/impl2"

import {
    Container,
} from "@nealrame/ts-injector"

@Component()
class Position {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

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

    ecs.addComponent(1, Position)
})()
