import {
    type TVector2D,
} from "./vector2d"

export type TSize = {
    width: number
    height: number
}

export type TRect = TVector2D & TSize

export class Rect implements TRect {
    constructor(private r_: TRect) {}

    public get x(): number {
        return this.r_.x
    }
    public set x(x: number) {
        this.r_.x = x
    }

    public get y(): number {
        return this.r_.y
    }
    public set y(y: number) {
        this.r_.y = y
    }

    public get width(): number {
        return this.r_.width
    }
    public set width(width: number) {
        this.r_.width = width
    }

    public get height(): number {
        return this.r_.height
    }
    public set height(height: number) {
        this.r_.height = height
    }

    public set(
        r: TRect,
    ): Rect {
        this.r_.x = r.x
        this.r_.y = r.y
        this.r_.width = r.width
        this.r_.height = r.height
        return this
    }

    public scale(
        k: number,
    ): Rect {
        this.r_.width *= k
        this.r_.height *= k
        return this
    }

    public translate(
        u: TVector2D,
    ): Rect {
        this.r_.x += u.x
        this.r_.y += u.y
        return this
    }

    public contains(
        u: TVector2D,
    ): boolean {
        return u.x >= this.r_.x && u.x < this.r_.x + this.r_.width
            && u.y >= this.r_.y && u.y < this.r_.y + this.r_.height
    }

    public static fromSize(
        s: TSize,
    ): Rect {
        return new Rect({
            x: 0,
            y: 0,
            width: s.width,
            height: s.height,
        })
    }

    public static wrap(
        r: TRect,
    ): Rect {
        return new Rect(r)
    }
}