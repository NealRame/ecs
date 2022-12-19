import * as ECS from "../lib"

import {
    type TVector2D,
    Vector2D,
} from "./maths"

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5
const SNAKE_SIZE = 3
const SNAKE_SPEED = 5

@ECS.Component class Course implements TVector2D {
    x = 0
    y = 0
}

@ECS.Component class Position implements TVector2D {
    x = 0
    y = 0
}

@ECS.Component class Game {
    points = 0
}
@ECS.Component class Fruit {}
@ECS.Component class SnakeHead {}
@ECS.Component class SnakeTail {}

@ECS.System({
    entities: ECS.query.HasAll(Game, SnakeHead, SnakeTail, Fruit),
    priority: 0,
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
    }
}

@ECS.System({
    entities: ECS.query.HasAll(Position, Course),
}) class MoveSystem implements ECS.ISystem {
    private course_ = Vector2D.zero()

    public update(): void {
        // Update course
    }

    public reset(): void {
        Vector2D.wrap(this.course_).set({
            x: 0,
            y: 0,
        })
    }
}

@ECS.System({
    entities: ECS.query.HasAll(Position, Course),
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

        for (const entity of registry.getEntitiesOfSystem(this)) {
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
        RenderSystem,
        MoveSystem,
    ],
})
class EngineData {
}

const engine = ECS.createEngine(EngineData)

;(window as any).engine = engine

engine.start()
