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
class RenderSystem extends ECS.SystemBase {
    private context_: CanvasRenderingContext2D

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        super()
        this.context_ = screen_.getContext("2d")
    }

    public async update(entities: Set<ECS.TEntity>, ecs: ECS.IEngine) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of entities) {
            const components = ecs.getEntityComponents(entity)
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
class MoveSnakeSystem extends ECS.SystemBase {
    public constructor(
        @Inject(SnakeSpeed) private speed_: number,
    ) { super() }

    public update(entities: Set<ECS.TEntity>, ecs: ECS.IEngine) {
        if ((ecs.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of entities) {
                const [position, course] = ecs.getEntityComponents(entity).getAll(Position, Course)

                ECS.maths.Vector2D.wrap(position).add(course)
            }

            // update snake entities course
            let previousCourse: ECS.maths.TVector2D | null = null
            for (const entity of entities) {
                const course = ecs.getEntityComponents(entity).get(Course)
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
class SnakeControlerSystem extends ECS.SystemBase<SnakeControlerEvents> {
    private course_: ECS.maths.TVector2D | null = null

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        super()
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

    private updateCourse_(head: ECS.TEntity, ecs: ECS.IEngine) {
        if (this.course_ != null && head != null) {
            const course = ecs.getEntityComponents(head).get(Course)
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
        ecs: ECS.IEngine,
    ) {
        if (head != null) {
            const headPosition = ecs.getEntityComponents(head).get(Position)
            const rect = ECS.maths.Rect.fromSize(this.screen_).scale(1/this.pixelResolution_)

            // check collision with canvas border
            if (!rect.contains(headPosition)) {
                this.emitter.emit("wallCollision")
                return
            }

            // check collision with snake tail
            for (const entity of tail) {
                const tailPosition = ecs.getEntityComponents(entity).get(Position)
                if (ECS.maths.Vector2D.equals(headPosition, tailPosition)) {
                    this.emitter.emit("tailCollision")
                    return
                }
            }
        }
    }

    public update(entities: Set<ECS.TEntity>, ecs: ECS.IEngine) {
        const [head, ...tail] = Array.from(entities)
        this.updateCourse_(head, ecs)
        this.checkCollision_(head, tail, ecs)
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
class FruitControlerSystem extends ECS.SystemBase<FruitControlerEvents> {
    public update(entities: Set<ECS.TEntity>, ecs: ECS.IEngine) {
        const a = Array.from(entities)
        if (a.length === 2) {
            const [p1, p2] = a.map(entity => ecs.getEntityComponents(entity).get(Position))
            if (p1.x === p2.x && p1.y === p2.y) {
                const fruit = a.find(entity => ecs.getEntityComponents(entity).has(Fruit))
                ecs.getEntityComponents(fruit).remove(Position)
                this.emitter.emit("fruitEaten", fruit)
            }
        }
    }
}


async function createSnake(
    ecs: ECS.Engine,
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

async function createFruit(ecs: ECS.Engine, x: number, y: number) {
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

    container.set(ECS.EntityFactory, ECS.BasicEntityFactory())
    container.set(Screen, screen)
    container.set(ScreenPixelResolution, PIXEL_SIZE)
    container.set(SnakeSpeed, PIXEL_SIZE)

    const ecs = container.get(ECS.Engine)

    const snakeControler = container.get(SnakeControlerSystem)
    const fruitControler = container.get(FruitControlerSystem)

    ecs
        .addSystem(fruitControler)
        .addSystem(snakeControler)
        .addSystem(container.get(RenderSystem))
        .addSystem(container.get(MoveSnakeSystem))

    createSnake(ecs, 5, { x: 10, y: 10 },)
    createFruit(ecs, 20, 20)

    let gameOver = false

    fruitControler.events.on("fruitEaten", async entity => {
        const old_tail = ecs.query().find(ECS.QueryHasAll(SnakeTail))

        if (old_tail != null) {
            const old_tail_components = ecs.getEntityComponents(old_tail)

            old_tail_components.remove(SnakeTail)

            const [old_tail_position, old_tail_course] = old_tail_components.getAll(Position, Course)
            const new_tail_position = { x: 0, y: 0 }

            ECS.maths.Vector2D.wrap(new_tail_position).set(old_tail_position).sub(old_tail_course)

            await createSnake(ecs, 1, new_tail_position, old_tail_course)

            ECS.maths.Vector2D.wrap(ecs.getEntityComponents(entity).add(Position)).set({
                x: Math.floor(Math.random()*WIDTH),
                y: Math.floor(Math.random()*HEIGHT),
            })
        }
    })

    snakeControler.events.once("tailCollision", () => { gameOver = true })
    snakeControler.events.once("wallCollision", () => { gameOver = true })

    ;(function loop() {
        ecs.update()
        if (!gameOver) {
            requestAnimationFrame(loop)
        }
    })()
})()
