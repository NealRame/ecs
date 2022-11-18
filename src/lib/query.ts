import {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    IEntity,
    IEntityQueryPredicate,
    IECS,
} from "./types"

export class EntityQuerySet {
    constructor(
        private ecs_: IECS,
        private entities_: Iterable<IEntity>,
    ) { }

    *[Symbol.iterator]() {
        for (const entity of this.entities_) {
            yield entity
        }
    }

    find(
        pred: IEntityQueryPredicate
    ): IEntity | undefined {
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                return entity
            }
        }
    }

    filter(
        pred: IEntityQueryPredicate
    ): Set<IEntity> {
        const filtered = new Set<IEntity>()
        for (const entity of this.entities_) {
            if (pred(this.ecs_.getEntityComponents(entity))) {
                filtered.add(entity)
            }
        }
        return filtered
    }

    partition(
        pred: IEntityQueryPredicate
    ): [Set<IEntity>, Set<IEntity>] {
        const [filtered, rejected] = [new Set<IEntity>(), new Set<IEntity>()]
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
    ...predicates: Array<IEntityQueryPredicate>
): IEntityQueryPredicate {
    return componentsContainer => predicates.every(pred => pred(componentsContainer))
}

export function QueryOr(
    ...predicates: Array<IEntityQueryPredicate>
): IEntityQueryPredicate {
    return componentsContainer => predicates.some(pred => pred(componentsContainer))
}

export function QueryHasAll(
    ...componentTypes: Array<TConstructor>
): IEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasAll(componentTypes)
}

export function QueryHasOne(
    ...componentTypes: Array<TConstructor>
): IEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasOne(componentTypes)
}
