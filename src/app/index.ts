import {
    type ISystem,
    Component,
    ECS,
    Entity,
} from "../lib"

import "./style.css"

interface IVector {
    x: number
    y: number
}

class Vector {
    public static dot(u: IVector, v: IVector): number {
        return u.x*v.x + u.y*v.y
    }
}

class Color extends Component {
    public constructor(
        public r: number,
        public g: number,
        public b: number,
    ) { super() }
}

class Course extends Component implements IVector {
    constructor(
        public x: number,
        public y: number,
    ) { super() }

    public static North = () => new Course( 0, -1)
    public static South = () => new Course( 0,  1)
    public static East  = () => new Course( 1,  0)
    public static West  = () => new Course(-1,  0)
}

class Position extends Component implements IVector {
    constructor(
        public x: number,
        public y: number,
    ) { super() }
}

class RenderSystem implements ISystem {
    public readonly componentsRequired = new Set([Color, Position])
    public ecs: ECS

    constructor(
        private context_: CanvasRenderingContext2D,
    ) { }

    public update(entities: Set<Entity>) {
        context.fillStyle = "#000"
        context.fillRect(0, 0, canvas.width, canvas.height)

        context.save()
        context.scale(10, 10)

        for (const entity of entities) {
            const position = this.ecs.getEntityComponent(entity, Position)
            const color = this.ecs.getEntityComponent(entity, Color)

            context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
            context.fillRect(position.x, position.y, 1, 1)
        }

        context.restore()
    }
}

class MoveSnakeSystem implements ISystem {
    public readonly componentsRequired = new Set([Position, Course])
    public ecs: ECS

    private frame_ = 0

    public constructor(
        public speed: number,
    ) { }

    public update(entities: Set<Entity>) {
        this.frame_ = (this.frame_ + 1) % this.speed
        if (this.frame_ === 0) {
            // update snake entities position
            for (const entity of entities) {
                const position = this.ecs.getEntityComponent(entity, Position)
                const course = this.ecs.getEntityComponent(entity, Course)
                position.x += course.x
                position.y += course.y
            }

            // update snake entities course
            let prev_course: IVector | null = null
            for (const entity of entities) {
                const current_course = this.ecs.getEntityComponent(entity, Course)
                const { x, y } = current_course

                if (prev_course !== null) {
                    current_course.x = prev_course.x
                    current_course.y = prev_course.y
                }

                prev_course = { x, y }
            }
        }
    }
}

class ControlSnakeSystem implements ISystem {
    public readonly componentsRequired = new Set([Course, Position])
    public ecs: ECS

    private course_: IVector | null = null

    constructor(
        private context_: CanvasRenderingContext2D,
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

    private updateCourse_(head: Entity) {
        if (this.course_ !== null) {
            const course = this.ecs.getEntityComponent(head, Course)
            if (Vector.dot(this.course_, course) === 0) {
                course.x = this.course_.x
                course.y = this.course_.y
                this.course_ = null
            }
        }
    }

    private checkCollision_(head: Entity, tail: Array<Entity>) {
        const { width, height } = this.context_.canvas
        const { x, y } = this.ecs.getEntityComponent(head, Position)
        // check collision with canvas border
        if (x < 0 || x >= width/10 || y < 0 || y >= height/10) {
            throw new Error("Snake is out of the canvas.")
        }
        // check collision with snake tail
        for (const entity of tail) {
            const position = this.ecs.getEntityComponent(entity, Position)
            if (position.x === x && position.y === y) {
                throw new Error("Snake is eating itself.")
            }
        }
    }

    public update(entities: Set<Entity>) {
        const [head, ...tail] = Array.from(entities)
        this.updateCourse_(head)
        this.checkCollision_(head, tail)
    }
}

function createSnake(ecs: ECS, x: number, y: number, length: number) {
    for (let i = 0; i < length; i++) {
        const entity = ecs.addEntity()

        ecs.addEntityComponent(entity, new Position(x, y + i))
        ecs.addEntityComponent(entity, new Color(255, 255, 255))
        ecs.addEntityComponent(entity, Course.North())
    }
}

const canvas = document.getElementById("screen") as HTMLCanvasElement

const width = window.innerWidth
const height = window.innerHeight

canvas.width = width
canvas.height = height

const context = canvas.getContext("2d")
const ecs = new ECS()

ecs.addSystem(new ControlSnakeSystem(context))
ecs.addSystem(new MoveSnakeSystem(20))
ecs.addSystem(new RenderSystem(context))

createSnake(ecs, 10, 10, 5)

;(function loop() {
    try {
        ecs.update()
        requestAnimationFrame(loop)
    } catch (e) {
        console.log("Game over!", e.message)
    }
})()
