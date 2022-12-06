import {
    TConstructor,
} from "@nealrame/ts-injector"

import type {
    TEntityQueryPredicate,
} from "./types"

/**
 * Accept all entities.
 * @returns `true`
 */
export function All(): boolean {
    return true
}

/**
 * Reject all entities.
 * @returns `false`
 */
export function None(): boolean {
    return false
}

/**
 * Check if the given entity has all the given components.
 * @param componentTypes some Components type
 * @returns a `TEntityQueryPredicate`
 */
export function HasAll(
    ...componentTypes: Array<TConstructor>
): TEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasAll(componentTypes)
}

/**
 * Check if an entity has at least one of the given components.
 * @param componentTypes some Components type
 * @returns a `TEntityQueryPredicate`
 */
export function HasOne(
    ...componentTypes: Array<TConstructor>
): TEntityQueryPredicate {
    return componentsContainer => componentsContainer.hasOne(componentTypes)
}

/**
 * Combine multiple predicates with a logical AND.
 * @param predicates some `TEntityQueryPredicate`s
 * @returns a `TEntityQueryPredicate`
 */
export function And(
    ...predicates: Array<TEntityQueryPredicate>
): TEntityQueryPredicate {
    return componentsContainer => predicates.every(pred => pred(componentsContainer))
}

/**
 * Combine multiple predicates with a logical OR.
 * @param predicates some `TEntityQueryPredicate`s
 * @returns a `TEntityQueryPredicate`
 */
export function Or(
    ...predicates: Array<TEntityQueryPredicate>
): TEntityQueryPredicate {
    return componentsContainer => predicates.some(pred => pred(componentsContainer))
}