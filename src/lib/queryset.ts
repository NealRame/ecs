import {
    EntitySet,
} from "./entity"

import type {
    IRegistry,
    IEntitySet,
    IEntityQuerySet,
    TEntity,
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
