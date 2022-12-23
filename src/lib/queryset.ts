import {
    EntitySet,
} from "./entity"

import type {
    IRegistry,
    IEntitySet,
    IEntityQuerySet,
    TEntity,
    TEntityQueryAggregate,
    TEntityQueryKeyMapper,
    TEntityQueryPredicate,
} from "./types"


export class EntityQuerySet implements IEntityQuerySet {
    constructor(
        private registry_: IRegistry,
        private entities_: IEntitySet,
        private predicate_?: TEntityQueryPredicate,
    ) { }

    [Symbol.iterator]() {
        return this.all()
    }

    *all() {
        for (const entity of this.entities_.all()) {
            if (this.predicate_?.(this.registry_.getComponents(entity)) ?? true) {
                yield entity
            }
        }
    }

    *allReversed() {
        for (const entity of this.entities_.allReversed()) {
            if (this.predicate_?.(this.registry_.getComponents(entity)) ?? true) {
                yield entity
            }
        }
    }

    first(): TEntity | undefined {
        for (const entity of this.entities_.all()) {
            if (this.predicate_?.(this.registry_.getComponents(entity)) ?? true) {
                return entity
            }
        }
    }

    filter(
        predicate: TEntityQueryPredicate
    ): IEntityQuerySet {
        return new EntityQuerySet(this.registry_, this, predicate)
    }

    find(
        predicate: TEntityQueryPredicate
    ): TEntity | undefined {
        for (const entity of this.entities_.all()) {
            if (predicate(this.registry_.getComponents(entity))) {
                return entity
            }
        }
    }

    groupBy(
        key: TEntityQueryKeyMapper,
    ): TEntityQueryAggregate {
        const aggregator: Record<string | number | symbol, EntitySet> = {}
        for (const entity of this.entities_.all()) {
            const components = this.registry_.getComponents(entity)
            const k = key(components)
            if (aggregator[k] == null) {
                aggregator[k] = new EntitySet()
            }
            aggregator[k].add(entity)
        }
        return Object.entries(aggregator).reduce((acc, [k, v]) => {
            acc[k] = new EntityQuerySet(this.registry_, v)
            return acc
        }, {} as TEntityQueryAggregate)
    }

    partition(
        pred: TEntityQueryPredicate
    ): [IEntitySet, IEntitySet] {
        const [filtered, rejected] = [new EntitySet(), new EntitySet()]
        for (const entity of this.entities_.all()) {
            if (pred(this.registry_.getComponents(entity))) {
                filtered.add(entity)
            } else {
                rejected.add(entity)
            }
        }
        return [filtered, rejected]
    }
}
