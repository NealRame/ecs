/* eslint-disable @typescript-eslint/ban-types */

import {
    TConstructor,
} from "@nealrame/ts-injector"

import {
    EventMap,
} from "@nealrame/ts-events"

export type Entity = number

export abstract class Component {
}

export type ComponentConstructor<T extends Component> = TConstructor<T>

export interface IComponentContainer {
    get<T extends Component>(component: ComponentConstructor<T>): T
    has(componentType: Function): boolean
    hasAll(componentTypes: Iterable<Function>): boolean
    hasOne(componentTypes: Iterable<Function>): boolean
}

export type ISystemAcceptCallback = (componentsContainer: IComponentContainer) => boolean

export function ComponentQueryHasAll(
    ...componentTypes: Array<Function>
): ISystemAcceptCallback {
    return componentsContainer => componentsContainer.hasAll(componentTypes)
}

export function ComponentQueryHasOne(
    ...componentTypes: Array<Function>
): ISystemAcceptCallback {
    return componentsContainer => componentsContainer.hasOne(componentTypes)
}

export interface ISystemUpdateContext<Events extends EventMap = {}> {
    ecs: IECS
}

export abstract class System<Events extends EventMap = {}> {
    abstract accept: ISystemAcceptCallback
    abstract update(entities: Set<Entity>, context: ISystemUpdateContext<Events>): void
}

export interface IECS {
    readonly frame: number

    hasEntity(entity: Entity): boolean
    addEntity(entity: Entity): Entity
    removeEntity(entity: Entity): IECS
    addEntityComponent(entity: Entity, component: Component): IECS
    getEntityComponents(entity: Entity): IComponentContainer
    getEntityComponent<T extends Component>(entity: Entity, componentType: ComponentConstructor<T>): T
    removeEntityComponent(entity: Entity, componentType: Function): IECS
    addSystem(system: System): IECS
    removeSystem(system: System): IECS
    update(): IECS
}

class ComponentContainer implements IComponentContainer {
    private components_ = new Map<Function, Component>()

    public add(component: Component) {
        this.components_.set(component.constructor, component)
    }

    public remove(componentType: Function) {
        this.components_.delete(componentType)
    }

    public get<T extends Component>(componentType: ComponentConstructor<T>)
        : T {
        const component = this.components_.get(componentType)
        if (component == null) {
            throw new Error(`Entity does not have component ${componentType.name}.`)
        }
        return component as T
    }

    public has(componentType: Function)
        : boolean {
        return this.components_.has(componentType)
    }

    public hasAll(componentTypes: Iterable<Function>)
        : boolean {
        for (const componentType of componentTypes) {
            if (!this.has(componentType)) {
                return false
            }
        }
        return true
    }

    public hasOne(componentTypes: Iterable<Function>)
        : boolean {
        for (const componentType of componentTypes) {
            if (this.has(componentType)) {
                return true
            }
        }
        return false
    }
}

function createComponentContainerView(
    componentContainer: ComponentContainer
): IComponentContainer {
    return {
        get<T extends Component>(
            componentType: ComponentConstructor<T>
        ): T {
            return componentContainer.get(componentType)
        },
        has(
            componentType: Function
        ): boolean {
            return componentContainer.has(componentType)
        },
        hasAll(
            componentTypes: Iterable<Function>
        ): boolean {
            return componentContainer.hasAll(componentTypes)
        },
        hasOne(
            componentTypes: Iterable<Function>
        ): boolean {
            return componentContainer.hasOne(componentTypes)
        },
    }
}

export class ECS {
    private nextEntity_ = 0
    private frame_ = 0

    private systems_: Map<System, Set<Entity>>
    private entities_: Map<Entity, ComponentContainer>
    private postponedEntityDeletions_ = new Array<Entity>()

    private checkEntity_(entity: Entity) {
        for (const system of this.systems_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
    }

    private checkEntitySystem_(entity: Entity, system: System) {
        const have = this.entities_.get(entity)
        if (have != null) {
            if (system.accept(have)) {
                this.systems_.get(system)?.add(entity)
            } else {
                this.systems_.get(system)?.delete(entity)
            }
        }
    }

    private removeEntity_(entity: Entity) {
        this.entities_.delete(entity)
        for (const entities of this.systems_.values()) {
            entities.delete(entity)
        }
    }

    private removePostponedEntities_() {
        while (this.postponedEntityDeletions_.length > 0) {
            this.removeEntity_(this.postponedEntityDeletions_.pop() as Entity)
        }
    }

    /**************************************************************************
     * Update *****************************************************************
     *************************************************************************/

    public constructor() {
        this.entities_ = new Map()
        this.systems_ = new Map()
    }

    public get frame(): number {
        return this.frame_
    }

    public update(): IECS {
        const context = {
            ecs: this,
        }

        for (const [system, entities] of this.systems_.entries()) {
            system.update(entities, context)
        }

        this.removePostponedEntities_()
        this.frame_ = this.frame_ + 1

        return this
    }

    /**************************************************************************
     * Entities/Components management *****************************************
     *************************************************************************/

    public hasEntity(
        entity: Entity
    ): boolean {
        return this.entities_.has(entity)
    }

    public addEntity()
        : Entity {
        const entity = this.nextEntity_++
        this.entities_.set(entity, new ComponentContainer())
        return entity
    }

    public removeEntity(
        entity: Entity
    ): IECS {
        this.postponedEntityDeletions_.push(entity)
        return this
    }

    public addEntityComponent<T extends Component>(
        entity: Entity,
        component: T,
    ): IECS {
        this.entities_.get(entity)?.add(component)
        // As we add a component to the given entity we have to add that entity
        // to systems which become compatible with it.
        this.checkEntity_(entity)
        return this
    }

    public removeEntityComponent<T extends Component>(
        entity: Entity,
        componentType: ComponentConstructor<T>,
    ): IECS {
        this.entities_.get(entity)?.remove(componentType)
        // As we remove a component from the given entity we have to remove
        // that entity from systems which become incompatible with it.
        this.checkEntity_(entity)
        return this
    }

    public getEntityComponents(
        entity: Entity,
    ): IComponentContainer {
        if (!this.hasEntity(entity)) {
            throw new Error(`Entity ${entity} does not exist.`)
        }
        return createComponentContainerView(this.entities_.get(entity) as ComponentContainer)
    }

    public getEntityComponent<T extends Component>(
        entity: Entity,
        componentType: ComponentConstructor<T>,
    ): T {
        const component = this.getEntityComponents(entity).get(componentType)
        if (component == null) {
            throw new Error(`Entity ${entity} does not have component ${componentType.name}.`)
        }
        return component
    }

    /**************************************************************************
     * Systems management *****************************************************
     *************************************************************************/

    public addSystem(
        system: System
    ): IECS {
        this.systems_.set(system, new Set())
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }

        return this
    }

    public removeSystem(
        system: System
    ): IECS {
        this.systems_.delete(system)
        return this
    }
}