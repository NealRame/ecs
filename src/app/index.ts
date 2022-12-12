import {
    type Token,
    Container,
    Inject,
} from "@nealrame/ts-injector"

import * as ECS from "../lib"
import * as maths from "./maths"

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
class Position implements maths.TVector2D {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@ECS.Component
class Course implements maths.TVector2D {
    constructor(
        public x: number,
        public y: number,
    ) {}
}

@ECS.Component class Fruit {}
@ECS.Component class SnakeHead {}
@ECS.Component class SnakeTail {}

@ECS.System({
    entities: ECS.query.HasAll(Position),
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
        registry: ECS.IRegistry,
    ) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of registry.getEntities(this)) {
            const components = registry.getComponents(entity)
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
    entities: ECS.query.HasAll(Position, Course),
})
class MoveSnakeSystem implements ECS.ISystem {
    public constructor(
        @Inject(SnakeSpeed) private speed_: number,
    ) { }

    public update(
        registry: ECS.IRegistry,
    ) {
        if ((registry.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of registry.getEntities(this)) {
                const [position, course] = registry.getComponents(entity).getAll(Position, Course)

                maths.Vector2D.wrap(position).add(course)
            }

            // update snake entities course
            let previousCourse: maths.TVector2D | null = null
            for (const entity of registry.getEntities(this)) {
                const course = registry.getComponents(entity).get(Course)
                const { x, y } = course

                if (previousCourse !== null) {
                    maths.Vector2D.wrap(course).set(previousCourse)
                }
                previousCourse = { x, y }
            }
        }
    }
}

@ECS.System({
    entities: ECS.query.HasOne(SnakeHead, SnakeTail, Fruit),
})
class SnakeControllerSystem implements ECS.ISystem {
    private course_ = maths.Vector2D.east()
    private keydownHandler_ = (event: KeyboardEvent) => {
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
    }

    private getFruitPosition_() {
        return {
            x: Math.floor(Math.random()*this.screen_.width/this.pixelResolution_),
            y: Math.floor(Math.random()*this.screen_.height/this.pixelResolution_),
        }
    }

    private checkCollision_(
        head: ECS.TEntity,
        tail: Array<ECS.TEntity>,
        registry: ECS.IRegistry,
    ): boolean {
        const headPosition = registry.getComponents(head).get(Position)
        const rect = maths.Rect.fromSize(this.screen_).scale(1/this.pixelResolution_)

        // check collision with canvas border
        if (!rect.contains(headPosition)) {
            return true
        }

        // check collision with snake tail
        for (const entity of tail) {
            const tailPosition = registry.getComponents(entity).get(Position)
            if (maths.Vector2D.equals(headPosition, tailPosition)) {
                return true
            }
        }
    }

    private checkFruitEaten_(
        head: ECS.TEntity,
        fruit: ECS.TEntity,
        registry: ECS.IRegistry,
    ): boolean {
        const headPosition = registry.getComponents(head).get(Position)
        const fruitPosition = registry.getComponents(fruit).get(Position)
        if (maths.Vector2D.equals(headPosition, fruitPosition)) {
            return true
        }
        return false
    }

    private async createSnake_(
        registry: ECS.IRegistry,
        length: number,
        position: maths.TVector2D,
        course: maths.TVector2D,
    ) {
        const entities = await registry.createEntities(length)
        entities.forEach((entity, i) => {
            const components = registry.getComponents(entity)

            maths.Vector2D.wrap(components.add(Position)).set(position)
            maths.Vector2D.wrap(components.add(Course)).set(course)
            maths.Vector2D.wrap(position).sub(course)

            if (i === 0 && length > 1) {
                components.add(SnakeHead)
            } else if (i === length - 1) {
                components.add(SnakeTail)
            }
        })
    }

    private async createFruit_(
        registry: ECS.IRegistry,
    ) {
        const entity = await registry.createEntity()
        const components = registry.getComponents(entity)
        maths.Vector2D.wrap(components.add(Position)).set(this.getFruitPosition_())
        components.add(Fruit)
    }

    private async growSnake_(
        registry: ECS.IRegistry,
    ) {
        const oldTail = registry.getEntities().find(ECS.query.HasAll(SnakeTail))

        if (oldTail != null) {
            const oldTailComponents = registry.getComponents(oldTail)

            oldTailComponents.remove(SnakeTail)

            const [oldTailPosition, oldTailCourse] = oldTailComponents.getAll(Position, Course)
            const newTailPosition = { x: 0, y: 0 }

            maths.Vector2D.wrap(newTailPosition).set(oldTailPosition).sub(oldTailCourse)

            await this.createSnake_(registry, 1, newTailPosition, oldTailCourse)
        }
    }

    private updateCourse_(head: ECS.TEntity, registry: ECS.IRegistry) {
        if (this.course_ != null && head != null) {
            const course = registry.getComponents(head).get(Course)
            if (maths.Vector2D.dot(this.course_, course) === 0) {
                course.x = this.course_.x
                course.y = this.course_.y
                this.course_ = null
            }
        }
    }

    private updateFruit_(fruit: ECS.TEntity, registry: ECS.IRegistry) {
        const position = registry.getComponents(fruit).get(Position)
        maths.Vector2D.wrap(position).set(this.getFruitPosition_())
    }

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) { }

    public async start(
        registry: ECS.IRegistry,
    ) {
        await this.createSnake_(registry, 5, { x: 0, y: 0 }, maths.Vector2D.east())
        await this.createFruit_(registry)
        window.addEventListener("keydown", this.keydownHandler_)
    }

    public async stop() {
        window.removeEventListener("keydown", this.keydownHandler_)
    }

    public update(
        registry: ECS.IRegistry,
    ) {
        const [[head, ...tail], [fruit]] = registry.getEntities(this).partition(ECS.query.HasOne(SnakeHead, SnakeTail))
        if (head != null) {
            this.updateCourse_(head, registry)
            if (this.checkCollision_(head, tail, registry)) {
                registry.stop()
                return
            }
        }
        if (head != null && fruit != null) {
            if (this.checkFruitEaten_(head, fruit, registry)) {
                this.updateFruit_(fruit, registry)
                this.growSnake_(registry)
            }
        }
    }
}


@ECS.Game({
    systems: [
        RenderSystem,
        SnakeControllerSystem,
        MoveSnakeSystem,
    ],
})
class SnakeGame {}

(async function() {
    const screen = document.getElementById("screen") as HTMLCanvasElement

    screen.width = WIDTH*PIXEL_SIZE
    screen.height = HEIGHT*PIXEL_SIZE

    const container = new Container()

    container.set(Screen, screen)
    container.set(ScreenPixelResolution, SNAKE_SIZE*PIXEL_SIZE)
    container.set(SnakeSpeed, SNAKE_SPEED)

    const registry = ECS.createRegistry(SnakeGame, container)




})()
