import type {
    IEntitySet,
    TEntity,
} from "./types"

export class EntitySet implements IEntitySet {
    private set_: Set<TEntity> = new Set()
    private queue_: Array<TEntity> = []

    ;[Symbol.toStringTag] = "EntitySet"

    ;[Symbol.iterator](): IterableIterator<TEntity> {
        return this.all()
    }

    get size(): number {
        return this.set_.size
    }

    clear(): this {
        this.set_.clear()
        this.queue_.length = 0
        return this
    }

    add(
        value: TEntity,
    ): this {
        if (!this.set_.has(value)) {
            this.set_.add(value)
            this.queue_.push(value)
        }
        return this
    }

    delete(
        value: TEntity,
    ): boolean {
        if (this.set_.has(value)) {
            this.set_.delete(value)
            this.queue_.splice(this.queue_.indexOf(value), 1)
            return true
        }
        return false
    }

    has(
        value: TEntity,
    ): boolean {
        return this.set_.has(value)
    }

    *all(): Generator<TEntity> {
        for (let i = 0; i < this.queue_.length; ++i) {
            yield this.queue_[i]
        }
    }

    *allReversed(): Generator<TEntity> {
        for (let i = this.queue_.length - 1; i >= 0; --i) {
            yield this.queue_[i]
        }
    }

    first(): TEntity | undefined {
        return this.queue_[0]
    }

    last(): TEntity | undefined {
        return this.queue_[this.queue_.length - 1]
    }
}
