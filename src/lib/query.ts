import {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    TEntity,
    TEntityQueryPredicate,
    IEngine,
} from "./types"

export class EntityQuerySet {
    constructor(
        private ecs_: IEngine,
        private entities_: Iterable<TEntity>,
    ) { }

    *[Symbol.iterator]() {
        for (const entity of this.entities_) {
            yield entity
        }
    }

    find(
        pred: TEntityQueryPredicate
    ): TEntity | undefined {
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                return entity
            }
        }
    }

    filter(
        pred: TEntityQueryPredicate
    ): Set<TEntity> {
        const filtered = new Set<TEntity>()
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                filtered.add(entity)
            }
        }
        return filtered
    }

    partition(
        pred: TEntityQueryPredicate
    ): [Set<TEntity>, Set<TEntity>] {
        const [filtered, rejected] = [new Set<TEntity>(), new Set<TEntity>()]
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                filtered.add(entity)
            } else {
                rejected.add(entity)
            }
        }
        return [filtered, rejected]
    }
}


export function QueryAll(): boolean {
    return true
}

export function QueryNone(): boolean {
    return false
}

export function QueryAnd(
    ...predicates: Array<TEntityQueryPredicate>
): TEntityQueryPredicate {
    return componentsContainer => predicates.every(pred => pred(componentsContainer))
}

export function QueryOr(
    ...predicates: Array<TEntityQueryPredicate>
): TEntityQueryPredicate {
    return componentsContainer => predicates.some(pred => pred(componentsContainer))
}

export function QueryHasAll(
    ...componentTypes: Array<TConstructor>
): TEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasAll(componentTypes)
}

export function QueryHasOne(
    ...componentTypes: Array<TConstructor>
): TEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasOne(componentTypes)
}
