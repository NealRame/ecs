import type {
    IEntityQuerySet,
    IRegistry,
    TEntity,
    TEntityQueryPredicate,
} from "./types"


export class EntityQuerySet implements IEntityQuerySet {
    constructor(
        private engine_: IRegistry,
        private entities_: Iterable<TEntity>,
        private predicate_?: TEntityQueryPredicate,
    ) { }

    *[Symbol.iterator]() {
        for (const entity of this.entities_) {
            if (this.predicate_?.(this.engine_.getComponents(entity)) ?? true) {
                yield entity
            }
        }
    }

    filter(
        predicate: TEntityQueryPredicate
    ): IEntityQuerySet {
        return new EntityQuerySet(this.engine_, this.entities_, predicate)
    }

    find(
        predicate: TEntityQueryPredicate
    ): TEntity | undefined {
        for (const entity of this.entities_) {
            if (predicate(this.engine_.getComponents(entity))) {
                return entity
            }
        }
    }

    partition(
        pred: TEntityQueryPredicate
    ): [Set<TEntity>, Set<TEntity>] {
        const [filtered, rejected] = [new Set<TEntity>(), new Set<TEntity>()]
        for (const entity of this.entities_) {
            if (pred(this.engine_.getComponents(entity))) {
                filtered.add(entity)
            } else {
                rejected.add(entity)
            }
        }
        return [filtered, rejected]
    }
}
