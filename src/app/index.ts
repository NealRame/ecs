import * as ECS from "../lib"
import { IRegistry } from "../lib"

import {
    type TVector2D,
    Vector2D,
} from "./maths"

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5
const SNAKE_SIZE = 3
const SNAKE_SPEED = 5

@ECS.Component class Game {
    points = 0
}
@ECS.Component class Course implements TVector2D {
    x = 0
    y = 0
}
@ECS.Component class Position implements TVector2D {
    x = 0
    y = 0
}
@ECS.Component class Fruit {}
@ECS.Component class SnakeHead {}
@ECS.Component class SnakeTail {}

@ECS.System({
}) class GameSystem implements ECS.ISystem {
    reset(registry: ECS.IRegistry): void {
        registry.createEntity(Game)

        const snake = [
            ...registry.createEntities(4, Position, Course, SnakeTail),
            registry.createEntity(Position, Course, SnakeHead),
        ]

        for (let i = 0; i < snake.length; ++i) {
            const components = registry.getComponents(snake[i])
            Vector2D.wrap(components.get(Position)).set({
                x: i,
                y: 0,
            })
            Vector2D.wrap(components.get(Course)).set({
                x: 1,
                y: 0,
            })
        }

        const fruit = registry.createEntity(Position, Fruit)
        const fruitComponents = registry.getComponents(fruit)
        Vector2D.wrap(fruitComponents.get(Position)).set({
            x: WIDTH/6,
            y: HEIGHT/6,
        })
    }
}

@ECS.System({
    entities: ECS.query.HasOne(SnakeHead, SnakeTail),
}) class MoveSystem implements ECS.ISystem {
    private nextCourse_: Vector2D | null = null
    private updateFrame_ = 0

    private handleKeydown_ = (event: KeyboardEvent) => {
        switch (event.key) {
        case "ArrowUp":
            Vector2D.wrap(this.nextCourse_).set(Vector2D.north())
            break
        case "ArrowDown":
            Vector2D.wrap(this.nextCourse_).set(Vector2D.south())
            break
        case "ArrowLeft":
            Vector2D.wrap(this.nextCourse_).set(Vector2D.west())
            break
        case "ArrowRight":
            Vector2D.wrap(this.nextCourse_).set(Vector2D.east())
            break
        }
    }

    public start(): void {
        document.addEventListener("keydown", this.handleKeydown_)
    }

    public stop(): void {
        document.removeEventListener("keydown", this.handleKeydown_)
    }

    public update(registry: IRegistry): void {
        this.updateFrame_ = (this.updateFrame_ + 1)%SNAKE_SPEED

        const head = registry.getSystemEntities(this).find(ECS.query.HasAll(SnakeHead))
        const headComponents = registry.getComponents(head)
        const headCourse = Vector2D.wrap(headComponents.get(Course))

        if (this.nextCourse_ == null) {
            this.nextCourse_ = Vector2D.copy(headCourse)
        }

        if (this.updateFrame_ === 0) {
            const nextCourse = Vector2D.copy(
                Vector2D.dot(headCourse, this.nextCourse_) === 0
                    ? this.nextCourse_
                    : headCourse
            )

            // snake entities have been create from tail to head so we need to
            // iterate them in reverse order.
            for (const entity of registry.getSystemEntities(this).allReversed()) {
                const components = registry.getComponents(entity)
                const course = Vector2D.wrap(components.get(Course))

                Vector2D.wrap(components.get(Position)).add(course)
                Vector2D.swap(course, nextCourse)
            }
        }
    }

    public reset(): void {
        this.nextCourse_ = null
    }
}

@ECS.System({
    entities: ECS.query.HasAll(Position, Course),
}) class CollisionSystem implements ECS.ISystem {
    public update(registry: ECS.IRegistry): void {
        // check for collisions with the walls and the snake itself
    }
}

@ECS.System({
    entities: ECS.query.HasAll(Position),
    priority: 1,
}) class RenderSystem implements ECS.ISystem {
    private canvas_: HTMLCanvasElement
    private context_: CanvasRenderingContext2D
    private pixelResolution_: number

    constructor() {
        this.canvas_ = document.querySelector("#screen")
        this.context_ = this.canvas_.getContext("2d")

        this.canvas_.width = WIDTH*PIXEL_SIZE
        this.canvas_.height = HEIGHT*PIXEL_SIZE

        this.pixelResolution_ = PIXEL_SIZE*SNAKE_SIZE
    }

    public update(
        registry: ECS.IRegistry,
    ): void {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.canvas_.width, this.canvas_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of registry.getSystemEntities(this)) {
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

@ECS.Engine({
    Systems: [
        GameSystem,
        MoveSystem,
        RenderSystem,
    ],
})
class EngineData {
}

const engine = ECS.createEngine(EngineData)

;(window as any).engine = engine

engine.start()
