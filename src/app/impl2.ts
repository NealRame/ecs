import {
    type IECS,
    type IEntity,
    type ISystem,
    type ISystemUpdateContext,
    BasicEntityFactory,
    Component,
    QueryHasAll,
    QueryHasOne,
    QueryAnd,
    ECS,
    EntityFactory,
    System,
} from "../lib/impl2"

import {
    IEmitter,
} from "@nealrame/ts-events"

import {
    type Token,
    Container,
    Inject,
} from "@nealrame/ts-injector"

const Screen: Token<HTMLCanvasElement> = Symbol("Screen")
const ScreenPixelResolution: Token<number> = Symbol("Pixel resolution")

const SnakeSpeed: Token<number> = Symbol("Snake speed")

interface IVector {
    x: number
    y: number
}

class Vector {
    constructor(private v_: IVector) {}

    get x(): number {
        return this.v_.x
    }

    get y(): number {
        return this.v_.y
    }

    set(v: IVector): Vector {
        this.v_.x = v.x
        this.v_.y = v.y
        return this
    }

    setX(x: number): Vector {
        this.v_.x = x
        return this
    }

    setY(y: number): Vector {
        this.v_.y = y
        return this
    }

    add(u: IVector): Vector {
        this.v_.x += u.x
        this.v_.y += u.y
        return this
    }

    sub(u: IVector): Vector {
        this.v_.x -= u.x
        this.v_.y -= u.y
        return this
    }

    mul(s: number): Vector {
        this.v_.x *= s
        this.v_.y *= s
        return this
    }

    div(s: number): Vector {
        this.v_.x /= s
        this.v_.y /= s
        return this
    }

    normalize(): Vector {
        const l = Math.sqrt(Vector.dot(this.v_, this.v_))
        if (l > 0) {
            this.div(l)
        }
        return this
    }

    static norm(u: IVector): number {
        return Math.sqrt(Vector.dot(u, u))
    }

    static dot(u: IVector, v: IVector): number {
        return u.x*v.x + u.y*v.y
    }

    static wrap(v: IVector): Vector {
        return new Vector(v)
    }

    public static north = () => ({ x:  0, y: -1 })
    public static south = () => ({ x:  0, y:  1 })
    public static east  = () => ({ x:  1, y:  0 })
    public static west  = () => ({ x: -1, y:  0 })
}

@Component()
class Color {
    public constructor(
        public r: number,
        public g: number,
        public b: number,
    ) {}
}

@Component()
class Position implements IVector {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@Component()
class Course implements IVector {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@Component() class Fruit {}
@Component() class SnakeHead {}
@Component() class SnakeTail {}

@System({
    predicate: QueryHasAll(Color, Position),
})
class RenderSystem implements ISystem {
    private context_: CanvasRenderingContext2D

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) {
        this.context_ = screen_.getContext("2d")
    }

    public async update(entities: Set<IEntity>, { ecs }: ISystemUpdateContext) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of entities) {
            const [position, color] = ecs.getEntityComponents(entity).getAll(Position, Color)

            this.context_.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
            this.context_.fillRect(position.x, position.y, 1, 1)
        }

        this.context_.restore()
    }
}

@System({
    predicate: QueryHasAll(Position, Course),
})
class MoveSnakeSystem implements ISystem {
    public constructor(
        @Inject(SnakeSpeed) private speed_: number,
    ) { }

    public update(entities: Set<IEntity>, { ecs }: ISystemUpdateContext) {
        if ((ecs.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of entities) {
                const [position, course] = ecs.getEntityComponents(entity).getAll(Position, Course)

                Vector.wrap(position).add(course)
            }

            // update snake entities course
            let prev_course: IVector | null = null
            for (const entity of entities) {
                const course = ecs.getEntityComponents(entity).get(Course)
                const { x, y } = course

                if (prev_course !== null) {
                    Vector.wrap(course).set(prev_course)
                }

                prev_course = { x, y }
            }
        }
    }
}

type SnakeControlerEvents = {
    tailCollision: void,
    wallCollision: void,
}

@System({
    predicate: QueryHasAll(Position, Course),
})
class SnakeControlerSystem implements ISystem<SnakeControlerEvents> {
    private course_: IVector | null = null

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

    private updateCourse_(head: IEntity, ecs: IECS) {
        if (this.course_ != null && head != null) {
            const course = ecs.getEntityComponents(head).get(Course)
            if (Vector.dot(this.course_, course) === 0) {
                course.x = this.course_.x
                course.y = this.course_.y
                this.course_ = null
            }
        }
    }

    private checkCollision_(
        head: IEntity,
        tail: Array<IEntity>,
        ecs: IECS,
        emitter: IEmitter<SnakeControlerEvents>,
    ) {
        if (head != null) {
            const { width, height } = this.screen_
            const { x, y } = ecs.getEntityComponents(head).get(Position)

            // check collision with canvas border
            if (x < 0
                || y < 0
                || x >= width/this.pixelResolution_
                || y >= height/this.pixelResolution_) {
                emitter.emit("wallCollision")
                return
            }

            // check collision with snake tail
            for (const entity of tail) {
                const position = ecs.getEntityComponents(entity).get(Position)
                if (position.x === x && position.y === y) {
                    emitter.emit("tailCollision")
                    return
                }
            }
        }
    }

    public update(entities: Set<IEntity>, { ecs, emitter }: ISystemUpdateContext) {
        const [head, ...tail] = Array.from(entities)
        this.updateCourse_(head, ecs)
        this.checkCollision_(head, tail, ecs, emitter)
    }
}

type FruitControlerEvents = {
    fruitEaten: IEntity,
}

@System({
    predicate: QueryAnd(
        QueryHasAll(Position),
        QueryHasOne(Fruit, SnakeHead),
    )
})
class FruitControlerSystem implements ISystem<FruitControlerEvents> {
    public update(entities: Set<IEntity>, { ecs, emitter }: ISystemUpdateContext) {
        const a = Array.from(entities)
        if (a.length === 2) {
            const [p1, p2] = a.map(entity => ecs.getEntityComponents(entity).get(Position))
            if (p1.x === p2.x && p1.y === p2.y) {
                const fruit = a.find(entity => ecs.getEntityComponents(entity).has(Fruit))
                ecs.getEntityComponents(fruit).remove(Position)
                emitter.emit("fruitEaten", fruit)
            }
        }
    }
}


async function createSnake(
    ecs: ECS,
    length: number,
    pos: IVector,
    course: IVector = Vector.north(),
) {
    const entities = await ecs.createEntities(length)
    entities.forEach((entity, i) => {
        const components = ecs.getEntityComponents(entity)
        const color = components.add(Color)

        color.r = 255
        color.g = 255
        color.b = 255

        Vector.wrap(components.add(Position)).set(pos)
        Vector.wrap(components.add(Course)).set(course)
        Vector.wrap(pos).sub(course)

        if (i === 0 && length > 1) {
            components.add(SnakeHead)
        } else if (i === length - 1) {
            components.add(SnakeTail)
        }
    })
}

async function createFruit(ecs: ECS, x: number, y: number) {
    const entity = await ecs.createEntity()
    const components = ecs.getEntityComponents(entity)

    components.add(Fruit)

    Vector.wrap(components.add(Position)).set({ x, y })

    const color = components.add(Color)
    color.r = 0
    color.g = 255
    color.b = 0
}

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5

const screen = document.getElementById("screen") as HTMLCanvasElement

screen.width = WIDTH*PIXEL_SIZE
screen.height = HEIGHT*PIXEL_SIZE

;(async function() {
    const container = new Container()

    container.set(EntityFactory, BasicEntityFactory())
    container.set(Screen, screen)
    container.set(ScreenPixelResolution, PIXEL_SIZE)
    container.set(SnakeSpeed, PIXEL_SIZE)

    const ecs = container.get(ECS)

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

    const fruitControlerEvents = ecs.events(fruitControler)
    fruitControlerEvents.on("fruitEaten", async entity => {
        const old_tail = ecs.query().find(QueryHasAll(SnakeTail))

        if (old_tail != null) {
            const old_tail_components = ecs.getEntityComponents(old_tail)

            old_tail_components.remove(SnakeTail)

            const [old_tail_position, old_tail_course] = old_tail_components.getAll(Position, Course)
            const new_tail_position = { x: 0, y: 0 }

            Vector.wrap(new_tail_position).set(old_tail_position).sub(old_tail_course)

            await createSnake(ecs, 1, new_tail_position, old_tail_course)

            Vector.wrap(ecs.getEntityComponents(entity).add(Position)).set({
                x: Math.floor(Math.random()*WIDTH),
                y: Math.floor(Math.random()*HEIGHT),
            })
        }
    })

    const snakeControlerEvents = ecs.events(snakeControler)
    snakeControlerEvents.once("tailCollision", () => {
        gameOver = true
    })
    snakeControlerEvents.once("wallCollision", () => {
        gameOver = true
    })

    ;(function loop() {
        ecs.update()
        if (!gameOver) {
            requestAnimationFrame(loop)
        }
    })()
})()
