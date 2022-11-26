import { TEmitter } from "@nealrame/ts-events"
import {
    type Token,
    Container,
    Inject,
} from "@nealrame/ts-injector"

import * as ECS from "../lib"
import { Vector2D } from "../lib/maths"

import "./style.css"

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5
const SNAKE_SIZE = 3
const SNAKE_SPEED = 5

const Screen: Token<HTMLCanvasElement> = Symbol("Screen")
const ScreenPixelResolution: Token<number> = Symbol("Pixel resolution")

const SnakeSpeed: Token<number> = Symbol("Snake speed")

@ECS.Component
class Position implements ECS.maths.TVector2D {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@ECS.Component
class Course implements ECS.maths.TVector2D {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@ECS.Component class Fruit {}
@ECS.Component class SnakeHead {}
@ECS.Component class SnakeTail {}

@ECS.System({
    entities: ECS.QueryHasAll(Position),
})
class RenderSystem implements ECS.ISystem {
    private context_: CanvasRenderingContext2D

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        this.context_ = screen_.getContext("2d")
    }

    public async update(
        entities: Set<ECS.TEntity>,
        engine: ECS.IEngine,
    ) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of entities) {
            const components = engine.getEntityComponents(entity)
            const position = components.get(Position)

            if (components.has(Fruit)) {
                this.context_.fillStyle = `red`
            } else if (components.has(SnakeHead)) {
                this.context_.fillStyle = `darkgreen`
            } else {
                this.context_.fillStyle = `green`
            }
            this.context_.fillRect(position.x, position.y, 1, 1)
        }

        this.context_.restore()
    }
}

@ECS.System({
    entities: ECS.QueryHasAll(Position, Course),
})
class MoveSnakeSystem implements ECS.ISystem {
    public constructor(
        @Inject(SnakeSpeed) private speed_: number,
    ) { }

    public update(
        entities: Set<ECS.TEntity>,
        engine: ECS.IEngine,
    ) {
        if ((engine.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of entities) {
                const [position, course] = engine.getEntityComponents(entity).getAll(Position, Course)

                ECS.maths.Vector2D.wrap(position).add(course)
            }

            // update snake entities course
            let previousCourse: ECS.maths.TVector2D | null = null
            for (const entity of entities) {
                const course = engine.getEntityComponents(entity).get(Course)
                const { x, y } = course

                if (previousCourse !== null) {
                    ECS.maths.Vector2D.wrap(course).set(previousCourse)
                }
                previousCourse = { x, y }
            }
        }
    }
}

type SnakeControllerEvents = {
    tailCollision: void,
    wallCollision: void,
}

const SnakeControllerEventHandlers = ECS.defineSystemEventHandler<SnakeControllerEvents>({
    tailCollision() {
        console.log("tail collision")
        this.engine.stop()
    },
    wallCollision() {
        console.log("wall collision")
        this.engine.stop()
    },
})

@ECS.System({
    entities: ECS.QueryHasAll(Position, Course),
    events: SnakeControllerEventHandlers,
})
class SnakeControllerSystem implements ECS.ISystem<SnakeControllerEvents> {
    private course_: ECS.maths.TVector2D | null = null

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        window.addEventListener("keydown", (event) => {
            switch (event.key) {
            case "ArrowUp":
                this.course_ = { x:  0, y: -1 }
                break
            case "ArrowDown":
                this.course_ = { x:  0, y:  1 }
                break
            case "ArrowLeft":
                this.course_ = { x: -1, y:  0 }
                break
            case "ArrowRight":
                this.course_ = { x:  1, y:  0 }
                break
            }
        })
    }

    private updateCourse_(head: ECS.TEntity, engine: ECS.IEngine) {
        if (this.course_ != null && head != null) {
            const course = engine.getEntityComponents(head).get(Course)
            if (ECS.maths.Vector2D.dot(this.course_, course) === 0) {
                course.x = this.course_.x
                course.y = this.course_.y
                this.course_ = null
            }
        }
    }

    private checkCollision_(
        head: ECS.TEntity,
        tail: Array<ECS.TEntity>,
        emit: TEmitter<SnakeControllerEvents>,
        engine: ECS.IEngine,
    ) {
        if (head != null) {
            const headPosition = engine.getEntityComponents(head).get(Position)
            const rect = ECS.maths.Rect.fromSize(this.screen_).scale(1/this.pixelResolution_)

            // check collision with canvas border
            if (!rect.contains(headPosition)) {
                emit("wallCollision")
                return
            }

            // check collision with snake tail
            for (const entity of tail) {
                const tailPosition = engine.getEntityComponents(entity).get(Position)
                if (ECS.maths.Vector2D.equals(headPosition, tailPosition)) {
                    emit("tailCollision")
                    return
                }
            }
        }
    }

    public update(
        entities: Set<ECS.TEntity>,
        engine: ECS.IEngine,
        emit: TEmitter<SnakeControllerEvents>,
    ) {
        const [head, ...tail] = Array.from(entities)
        this.updateCourse_(head, engine)
        this.checkCollision_(head, tail, emit, engine)
    }
}

type FruitControlerEvents = {
    fruitEaten: void,
}

const FruitControlerEventHandlers = ECS.defineSystemEventHandler<FruitControlerEvents>({
    async fruitEaten() {
        const oldTail = this.engine.queryEntities().find(ECS.QueryHasAll(SnakeTail))

        if (oldTail != null) {
            const oldTailComponents = this.engine.getEntityComponents(oldTail)

            oldTailComponents.remove(SnakeTail)

            const [oldTailPosition, oldTailCourse] = oldTailComponents.getAll(Position, Course)
            const newTailPosition = { x: 0, y: 0 }

            ECS.maths.Vector2D.wrap(newTailPosition).set(oldTailPosition).sub(oldTailCourse)

            await createSnake(this.engine, 1, newTailPosition, oldTailCourse)
        }
    }
})

@ECS.System({
    entities: ECS.QueryAnd(
        ECS.QueryHasAll(Position),
        ECS.QueryHasOne(Fruit, SnakeHead),
    ),
    events: FruitControlerEventHandlers,
})
class FruitControlerSystem implements ECS.ISystem<FruitControlerEvents> {
    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) { }

    private getFruitPosition_() {
        return {
            x: Math.floor(Math.random()*this.screen_.width/this.pixelResolution_),
            y: Math.floor(Math.random()*this.screen_.height/this.pixelResolution_),
        }
    }

    public update(
        entities: Set<ECS.TEntity>,
        engine: ECS.IEngine,
        emit: TEmitter<FruitControlerEvents>,
    ) {
        const a = Array.from(entities)
        if (a.length === 2) {
            const [p1, p2] = a.map(entity => engine.getEntityComponents(entity).get(Position))
            if (p1.x === p2.x && p1.y === p2.y) {
                const fruit = a.find(entity => engine.getEntityComponents(entity).has(Fruit))
                Vector2D.wrap(engine.getEntityComponents(fruit).get(Position)).set(this.getFruitPosition_())
                emit("fruitEaten")
            }
        }
    }
}

@ECS.Game({
    systems: [SnakeControllerSystem, FruitControlerSystem, MoveSnakeSystem, RenderSystem],
})
class SnakeGame {}

async function createSnake(
    engine: ECS.IEngine,
    length: number,
    pos: ECS.maths.TVector2D,
    course: ECS.maths.TVector2D = ECS.maths.Vector2D.north(),
) {
    const entities = await engine.createEntities(length)
    entities.forEach((entity, i) => {
        const components = engine.getEntityComponents(entity)

        ECS.maths.Vector2D.wrap(components.add(Position)).set(pos)
        ECS.maths.Vector2D.wrap(components.add(Course)).set(course)
        ECS.maths.Vector2D.wrap(pos).sub(course)

        if (i === 0 && length > 1) {
            components.add(SnakeHead)
        } else if (i === length - 1) {
            components.add(SnakeTail)
        }
    })
}

async function createFruit(
    ecs: ECS.IEngine,
    pos: ECS.maths.TVector2D,
) {
    const entity = await ecs.createEntity()
    const components = ecs.getEntityComponents(entity)

    components.add(Fruit)

    ECS.maths.Vector2D.wrap(components.add(Position)).set(pos)
}

(async function() {
    const screen = document.getElementById("screen") as HTMLCanvasElement

    screen.width = WIDTH*PIXEL_SIZE
    screen.height = HEIGHT*PIXEL_SIZE

    const container = new Container()

    container.set(Screen, screen)
    container.set(ScreenPixelResolution, SNAKE_SIZE*PIXEL_SIZE)
    container.set(SnakeSpeed, SNAKE_SPEED)

    const engine = ECS.createEngine(SnakeGame, container)

    createSnake(engine, 5, { x: 10, y: 10 },)
    createFruit(engine, { x: 5, y: 5 })

    engine.start()
})()
