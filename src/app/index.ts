import { TEmitter } from "@nealrame/ts-events"
import {
    type Token,
    Container,
    Inject,
} from "@nealrame/ts-injector"

import * as ECS from "../lib"

import "./style.css"

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
        @Inject(ECS.EngineKey) private engine_: ECS.IEngine,
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        this.context_ = screen_.getContext("2d")
    }

    public async update(entities: Set<ECS.TEntity>) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of entities) {
            const components = this.engine_.getEntityComponents(entity)
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
        @Inject(ECS.EngineKey) private engine_: ECS.IEngine,
        @Inject(SnakeSpeed) private speed_: number,
    ) { }

    public update(
        entities: Set<ECS.TEntity>,
    ) {
        if ((this.engine_.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of entities) {
                const [position, course] = this.engine_.getEntityComponents(entity).getAll(Position, Course)

                ECS.maths.Vector2D.wrap(position).add(course)
            }

            // update snake entities course
            let previousCourse: ECS.maths.TVector2D | null = null
            for (const entity of entities) {
                const course = this.engine_.getEntityComponents(entity).get(Course)
                const { x, y } = course

                if (previousCourse !== null) {
                    ECS.maths.Vector2D.wrap(course).set(previousCourse)
                }
                previousCourse = { x, y }
            }
        }
    }
}

type SnakeControlerEvents = {
    tailCollision: void,
    wallCollision: void,
}

@ECS.System({
    entities: ECS.QueryHasAll(Position, Course),
})
class SnakeControlerSystem implements ECS.ISystem<SnakeControlerEvents> {
    private course_: ECS.maths.TVector2D | null = null

    constructor(
        @Inject(ECS.EngineKey) private engine_: ECS.IEngine,
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

    private updateCourse_(head: ECS.TEntity) {
        if (this.course_ != null && head != null) {
            const course = this.engine_.getEntityComponents(head).get(Course)
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
        emit: TEmitter<SnakeControlerEvents>,
    ) {
        if (head != null) {
            const headPosition = this.engine_.getEntityComponents(head).get(Position)
            const rect = ECS.maths.Rect.fromSize(this.screen_).scale(1/this.pixelResolution_)

            // check collision with canvas border
            if (!rect.contains(headPosition)) {
                emit("wallCollision")
                return
            }

            // check collision with snake tail
            for (const entity of tail) {
                const tailPosition = this.engine_.getEntityComponents(entity).get(Position)
                if (ECS.maths.Vector2D.equals(headPosition, tailPosition)) {
                    emit("tailCollision")
                    return
                }
            }
        }
    }

    public update(
        entities: Set<ECS.TEntity>,
        emit: TEmitter<SnakeControlerEvents>,
    ) {
        const [head, ...tail] = Array.from(entities)
        this.updateCourse_(head)
        this.checkCollision_(head, tail, emit)
    }

    @ECS.Once<SnakeControlerEvents, "tailCollision">
    public tailCollision() {
        console.log("tail collision")
    }

    @ECS.Once<SnakeControlerEvents, "wallCollision">
    public wallCollision() {
        console.log("wall collision")
    }
}

type FruitControlerEvents = {
    fruitEaten: ECS.TEntity,
}

@ECS.System({
    entities: ECS.QueryAnd(
        ECS.QueryHasAll(Position),
        ECS.QueryHasOne(Fruit, SnakeHead),
    )
})
class FruitControlerSystem implements ECS.ISystem<FruitControlerEvents> {
    constructor(
        @Inject(ECS.EngineKey) private engine_: ECS.IEngine,
    ) { }

    public update(
        entities: Set<ECS.TEntity>,
        emit: TEmitter<FruitControlerEvents>,
    ) {
        const a = Array.from(entities)
        if (a.length === 2) {
            const [p1, p2] = a.map(entity => this.engine_.getEntityComponents(entity).get(Position))
            if (p1.x === p2.x && p1.y === p2.y) {
                const fruit = a.find(entity => this.engine_.getEntityComponents(entity).has(Fruit))
                this.engine_.getEntityComponents(fruit).remove(Position)
                emit("fruitEaten", fruit)
            }
        }
    }

    @ECS.On<FruitControlerEvents, "fruitEaten">
    public async fruitEaten(
        fruit: ECS.TEntity,
    ) {
        const old_tail = this.engine_.queryEntities().find(ECS.QueryHasAll(SnakeTail))

        if (old_tail != null) {
            const old_tail_components = this.engine_.getEntityComponents(old_tail)

            old_tail_components.remove(SnakeTail)

            const [old_tail_position, old_tail_course] = old_tail_components.getAll(Position, Course)
            const new_tail_position = { x: 0, y: 0 }

            ECS.maths.Vector2D.wrap(new_tail_position).set(old_tail_position).sub(old_tail_course)

            await createSnake(this.engine_, 1, new_tail_position, old_tail_course)

            ECS.maths.Vector2D.wrap(this.engine_.getEntityComponents(fruit).add(Position)).set({
                x: Math.floor(Math.random()*WIDTH),
                y: Math.floor(Math.random()*HEIGHT),
            })
        }
    }
}

@ECS.Game({
    systems: [SnakeControlerSystem, FruitControlerSystem, MoveSnakeSystem, RenderSystem],
})
class SnakeGame {}

async function createSnake(
    ecs: ECS.IEngine,
    length: number,
    pos: ECS.maths.TVector2D,
    course: ECS.maths.TVector2D = ECS.maths.Vector2D.north(),
) {
    const entities = await ecs.createEntities(length)
    entities.forEach((entity, i) => {
        const components = ecs.getEntityComponents(entity)

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
    x: number,
    y: number,
) {
    const entity = await ecs.createEntity()
    const components = ecs.getEntityComponents(entity)

    components.add(Fruit)

    ECS.maths.Vector2D.wrap(components.add(Position)).set({ x, y })
}

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5

const screen = document.getElementById("screen") as HTMLCanvasElement

screen.width = WIDTH*PIXEL_SIZE
screen.height = HEIGHT*PIXEL_SIZE

;(async function() {
    const container = new Container()

    container.set(Screen, screen)
    container.set(ScreenPixelResolution, PIXEL_SIZE)
    container.set(SnakeSpeed, PIXEL_SIZE)

    const engine = ECS.createEngine(SnakeGame, container)

    createSnake(engine, 5, { x: 10, y: 10 },)
    createFruit(engine, 20, 20)

    const gameOver = false

    ;(function loop() {
        engine.update()
        if (!gameOver) {
            requestAnimationFrame(loop)
        }
    })()
})()
