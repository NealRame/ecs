import {
    type Token,
    Container,
    Inject,
} from "@nealrame/ts-injector"

import * as ECS from "../lib"

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
        engine: ECS.IEngine,
    ) {
        this.context_.fillStyle = "#000"
        this.context_.fillRect(0, 0, this.screen_.width, this.screen_.height)

        this.context_.save()
        this.context_.scale(this.pixelResolution_, this.pixelResolution_)

        for (const entity of engine.getEntities(this)) {
            const components = engine.getComponents(entity)
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
        engine: ECS.IEngine,
    ) {
        if ((engine.frame%this.speed_) === 0) {
            // update snake entities position
            for (const entity of engine.getEntities(this)) {
                const [position, course] = engine.getComponents(entity).getAll(Position, Course)

                ECS.maths.Vector2D.wrap(position).add(course)
            }

            // update snake entities course
            let previousCourse: ECS.maths.TVector2D | null = null
            for (const entity of engine.getEntities(this)) {
                const course = engine.getComponents(entity).get(Course)
                const { x, y } = course

                if (previousCourse !== null) {
                    ECS.maths.Vector2D.wrap(course).set(previousCourse)
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
    private course_ = ECS.maths.Vector2D.east()
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
        engine: ECS.IEngine,
    ): boolean {
        const headPosition = engine.getComponents(head).get(Position)
        const rect = ECS.maths.Rect.fromSize(this.screen_).scale(1/this.pixelResolution_)

        // check collision with canvas border
        if (!rect.contains(headPosition)) {
            return true
        }

        // check collision with snake tail
        for (const entity of tail) {
            const tailPosition = engine.getComponents(entity).get(Position)
            if (ECS.maths.Vector2D.equals(headPosition, tailPosition)) {
                return true
            }
        }
    }

    private checkFruitEaten_(
        head: ECS.TEntity,
        fruit: ECS.TEntity,
        engine: ECS.IEngine,
    ): boolean {
        const headPosition = engine.getComponents(head).get(Position)
        const fruitPosition = engine.getComponents(fruit).get(Position)
        if (ECS.maths.Vector2D.equals(headPosition, fruitPosition)) {
            return true
        }
        return false
    }

    private async createSnake_(
        engine: ECS.IEngine,
        length: number,
        position: ECS.maths.TVector2D,
        course: ECS.maths.TVector2D,
    ) {
        const entities = await engine.createEntities(length)
        entities.forEach((entity, i) => {
            const components = engine.getComponents(entity)

            ECS.maths.Vector2D.wrap(components.add(Position)).set(position)
            ECS.maths.Vector2D.wrap(components.add(Course)).set(course)
            ECS.maths.Vector2D.wrap(position).sub(course)

            if (i === 0 && length > 1) {
                components.add(SnakeHead)
            } else if (i === length - 1) {
                components.add(SnakeTail)
            }
        })
    }

    private async createFruit_(
        engine: ECS.IEngine,
    ) {
        const entity = await engine.createEntity()
        const components = engine.getComponents(entity)
        ECS.maths.Vector2D.wrap(components.add(Position)).set(this.getFruitPosition_())
        components.add(Fruit)
    }

    private async growSnake_(
        engine: ECS.IEngine,
    ) {
        const oldTail = engine.getEntities().find(ECS.query.HasAll(SnakeTail))

        if (oldTail != null) {
            const oldTailComponents = engine.getComponents(oldTail)

            oldTailComponents.remove(SnakeTail)

            const [oldTailPosition, oldTailCourse] = oldTailComponents.getAll(Position, Course)
            const newTailPosition = { x: 0, y: 0 }

            ECS.maths.Vector2D.wrap(newTailPosition).set(oldTailPosition).sub(oldTailCourse)

            await this.createSnake_(engine, 1, newTailPosition, oldTailCourse)
        }
    }

    private updateCourse_(head: ECS.TEntity, engine: ECS.IEngine) {
        if (this.course_ != null && head != null) {
            const course = engine.getComponents(head).get(Course)
            if (ECS.maths.Vector2D.dot(this.course_, course) === 0) {
                course.x = this.course_.x
                course.y = this.course_.y
                this.course_ = null
            }
        }
    }

    private updateFruit_(fruit: ECS.TEntity, engine: ECS.IEngine) {
        const position = engine.getComponents(fruit).get(Position)
        ECS.maths.Vector2D.wrap(position).set(this.getFruitPosition_())
    }

    constructor(
        @Inject(Screen) private screen_: HTMLCanvasElement,
        @Inject(ScreenPixelResolution) private pixelResolution_: number,
    ) { }

    public async start(
        engine: ECS.IEngine,
    ) {
        await this.createSnake_(engine, 5, { x: 0, y: 0 }, ECS.maths.Vector2D.east())
        await this.createFruit_(engine)
        window.addEventListener("keydown", this.keydownHandler_)
    }

    public async stop() {
        window.removeEventListener("keydown", this.keydownHandler_)
    }

    public update(
        engine: ECS.IEngine,
    ) {
        const [[head, ...tail], [fruit]] = engine.getEntities(this).partition(ECS.query.HasOne(SnakeHead, SnakeTail))
        if (head != null) {
            this.updateCourse_(head, engine)
            if (this.checkCollision_(head, tail, engine)) {
                engine.stop()
                return
            }
        }
        if (head != null && fruit != null) {
            if (this.checkFruitEaten_(head, fruit, engine)) {
                this.updateFruit_(fruit, engine)
                this.growSnake_(engine)
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

    const engine = ECS.createEngine(SnakeGame, container)

    engine.start()
})()
