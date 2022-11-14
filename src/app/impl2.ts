import {
    type IECS,
    type IEntity,
    type ISystem,
    type ISystemUpdateContext,
    BasicEntityFactory,
    Component,
    ComponentQueryHasAll,
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

@System({
    accept: ComponentQueryHasAll(Color, Position),
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
    accept: ComponentQueryHasAll(Position, Course),
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

type ControlSnakeEvents = {
    tailCollision: void,
    wallCollision: void,
}

@System({
    accept: ComponentQueryHasAll(Position, Course),
})
class ControlSnakeSystem implements ISystem<ControlSnakeEvents> {
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
        emitter: IEmitter<ControlSnakeEvents>,
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


async function createSnake(ecs: ECS, x: number, y: number, length: number) {
    const entities = await ecs.createEntities(length)
    entities.forEach((entity, i) => {
        const pos = ecs.getEntityComponents(entity).add(Position)
        const color = ecs.getEntityComponents(entity).add(Color)
        const course = ecs.getEntityComponents(entity).add(Course)

        Vector.wrap(course).set(Vector.north())
        Vector.wrap(pos).set({ x, y: y + i })

        if (i === 0) {
            color.r = 255
            color.g = 0
            color.b = 0
        } else {
            color.r = 255
            color.g = 255
            color.b = 255
        }
    })
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
    container.set(SnakeSpeed, 5)

    const ecs = container.get(ECS)

    createSnake(ecs, 10, 10, 5)

    ecs.addSystem(RenderSystem)
    ecs.addSystem(MoveSnakeSystem)
    ecs.addSystem(ControlSnakeSystem)

    ;(function loop() {
        try {
            ecs.update()
            requestAnimationFrame(loop)
        } catch (e) {
            console.log("Game over!", e.message)
        }
    })()
})()
