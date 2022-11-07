import {
    EntityFactory,
    ECS,
    BasicEntityFactory,
} from "../lib/impl2"

import {
    Container,
} from "@nealrame/ts-injector"

const container = new Container()
container.set(EntityFactory, BasicEntityFactory())

const ecs = container.get(ECS)

console.log(ecs.addEntity())
console.log(ecs.addEntity())
console.log(ecs.addEntity())