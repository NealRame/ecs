import * as ECS from "../lib"

import {
    type TEmitter,
} from "@nealrame/ts-events"

import {
    type TVector2D,
    Vector2D,
    Rect,
} from "./maths"

const WIDTH = 84
const HEIGHT = 48
const PIXEL_SIZE = 5
const SNAKE_SIZE = 3
const SNAKE_SPEED = 5

@ECS.Component class Game {
    points = 0
    width = WIDTH
    height = HEIGHT
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

type GameSystemEvents = {
    wallCollision: void
    tailCollision: void
}

@ECS.System({
    entities: ECS.query.All,
}) class GameSystem implements ECS.ISystem<GameSystemEvents> {
    reset(registry: ECS.IRegistry): void {
        const game = registry.createEntity(Game)
        const gameComponent = registry.getComponents(game).get(Game)
        gameComponent.points = 0
        gameComponent.width = Math.round(WIDTH/3)
        gameComponent.height = Math.round(HEIGHT/3)

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
            x: Math.round(gameComponent.width/2),
            y: Math.round(gameComponent.height/2),
        })
    }

    update(registry: ECS.IRegistry, emit: TEmitter<GameSystemEvents>): void {
        const aggregate = registry.getSystemEntities(this).groupBy(
            components => {
                if (components.has(Game)) {
                    return "game"
                } else if (components.has(Fruit)) {
                    return "fruit"
                } else if (components.has(SnakeHead)) {
                    return "snakeHead"
                } else if (components.has(SnakeTail)) {
                    return "snakeTail"
                }
                return "_"
            }
        )

        const game = aggregate["game"]?.first()
        const snakeHead = aggregate["snakeHead"]?.first()
        const fruit = aggregate["fruit"]?.first()

        if (game == null || snakeHead == null || fruit == null) {
            return
        }

        const gameComponent = registry.getComponents(game).get(Game)

        const snakeHeadPosition = registry.getComponents(snakeHead).get(Position)
        const fruitPosition = registry.getComponents(fruit).get(Position)

        // check for wall collision
        if (!Rect.fromSize(gameComponent).contains(snakeHeadPosition)) {
            emit("wallCollision")
            return
        }

        // check for snake collision
        for (const entity of aggregate["snakeTail"]?.all() ?? []) {
            const snakeTailPosition = registry.getComponents(entity).get(Position)
            if (Vector2D.equals(snakeHeadPosition, snakeTailPosition)) {
                emit("tailCollision")
                return
            }
        }

        // check for fruit collision
        if (Vector2D.equals(snakeHeadPosition, fruitPosition)) {
            gameComponent.points += 1
            Vector2D.wrap(fruitPosition).set({
                x: Math.round(Math.random()*gameComponent.width),
                y: Math.round(Math.random()*gameComponent.height),
            })
        }
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

    public update(registry: ECS.IRegistry): void {
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
    @ECS.On(GameSystem)("wallCollision")
    public onWallCollision(engine: ECS.IEngine): void {
        engine.stop()
    }

    @ECS.On(GameSystem)("tailCollision")
    public onTailCollision(engine: ECS.IEngine): void {
        engine.stop()
    }
}

const engine = ECS.createEngine(EngineData)

;(window as any).engine = engine

engine.start()
