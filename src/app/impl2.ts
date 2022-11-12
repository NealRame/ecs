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

@Component()
class Velocity {
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

    const p = ecs.addComponent(1, Position)
    p.x = 10
    p.y = 20

    const v = ecs.addComponent(1, Velocity)
    v.x = 1
    v.y = 1

    const [position, velocity] = ecs.getComponents(1, Position, Velocity)

    console.log(position)
    console.log(velocity)
})()
