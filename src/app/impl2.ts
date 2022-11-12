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

    const components = ecs.getEntityComponents(10)

    const p = components.add(Position)
    p.x = 10
    p.y = 20

    const v = components.add(Velocity)
    v.x = 1
    v.y = 1

    console.log(components.hasAll([Position, Velocity]))
    console.log(components.hasOne([Position, Velocity]))

    const [position, velocity] = components.getAll([Position, Velocity])

    console.log(position)
    console.log(velocity)
})()
