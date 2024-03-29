export interface TVector2D {
    x: number
    y: number
}

export class Vector2D implements TVector2D {
    constructor(private v_: TVector2D) {}

    public get x(): number {
        return this.v_.x
    }
    public set x(x: number) {
        this.v_.x = x
    }

    public get y(): number {
        return this.v_.y
    }
    public set y(y: number) {
        this.v_.y = y
    }

    public set(
        v: TVector2D,
    ): Vector2D {
        this.v_.x = v.x
        this.v_.y = v.y
        return this
    }

    public add(
        u: TVector2D,
    ): Vector2D {
        this.v_.x += u.x
        this.v_.y += u.y
        return this
    }

    public sub(
        u: TVector2D,
    ): Vector2D {
        this.v_.x -= u.x
        this.v_.y -= u.y
        return this
    }

    public mul(
        s: number,
    ): Vector2D {
        this.v_.x *= s
        this.v_.y *= s
        return this
    }

    public static equals(
        u: TVector2D,
        v: TVector2D,
    ): boolean {
        return u.x === v.x && u.y === v.y
    }

    public static dot(
        u: TVector2D,
        v: TVector2D,
    ): number {
        return u.x*v.x + u.y*v.y
    }

    public static norm(v: TVector2D): number {
        return Math.sqrt(Vector2D.dot(v, v))
    }

    public static copy({ x, y }: TVector2D): Vector2D {
        return new Vector2D({ x, y })
    }

    public static wrap(v: TVector2D): Vector2D {
        return new Vector2D(v)
    }

    public static swap(
        u: TVector2D,
        v: TVector2D,
    ): void {
        const temp = Vector2D.copy(u)
        u.x = v.x
        u.y = v.y
        v.x = temp.x
        v.y = temp.y
    }

    public static zero(): TVector2D {
        return { x: 0, y: 0 }
    }

    public static north(): TVector2D {
        return { x: 0, y: -1 }
    }

    public static south(): TVector2D {
        return { x: 0, y: 1 }
    }

    public static east(): TVector2D {
        return { x: 1, y: 0 }
    }

    public static west(): TVector2D {
        return { x: -1, y: 0 }
    }
}
