import {
    type TConstructor,
    Container,
} from "@nealrame/ts-injector"

import type {
    IComponentContainer,
    TEntity,
    TConstructorsOf,
} from "./types"

export class ComponentContainer implements IComponentContainer{
    // eslint-disable-next-line @typescript-eslint/ban-types
    private components_ = new Map<Function, unknown>()

    constructor(
        private entity_: TEntity,
        private container_: Container,
        private updateComponentsCallback_: () => void,
    ) {}

    public get<T>(
        componentType: TConstructor<T>,
    ): T {
        const component = this.components_.get(componentType)
        if (component == null) {
            throw new Error(`Entity ${this.entity_} does not have component ${componentType.name}`)
        }
        return component as T
    }

    public getAll<T extends Array<unknown>>(
        ...componentsType: TConstructorsOf<T>
    ): T {
        return componentsType.map(componentsType => this.get(componentsType)) as T
    }

    public add<T>(
        componentType: TConstructor<T>,
    ): T {
        const component = this.container_.get(componentType)
        this.components_.set(componentType, component)
        this.updateComponentsCallback_()
        return component
    }

    public remove(
        componentType: TConstructor,
    ): void {
        this.components_.delete(componentType)
        this.updateComponentsCallback_()
    }

    public has(
        componentType: TConstructor,
    ): boolean {
        return this.components_.has(componentType)
    }

    public hasAll(
        componentTypes: Iterable<TConstructor>,
    ): boolean {
        for (const componentType of componentTypes) {
            if (!this.has(componentType)) {
                return false
            }
        }
        return true
    }

    public hasOne(
        componentTypes: Iterable<TConstructor>,
    ): boolean {
        for (const componentType of componentTypes) {
            if (this.has(componentType)) {
                return true
            }
        }
        return false
    }
}
