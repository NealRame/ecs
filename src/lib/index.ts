import {
    TConstructor,
} from "@nealrame/ts-injector"

export type Entity = number

export abstract class Component {
}

export type ComponentConstructor<T extends Component> = TConstructor<T>

export interface ISystem {
    update(entities: Set<Entity>): void
    readonly componentsRequired: Set<Function>
    ecs: IECS
}

export interface IComponentContainer {
    get<T extends Component>(component: ComponentConstructor<T>): T
    has(componentType: Function): boolean
    hasAll(componentTypes: Set<Function>): boolean
}

export class ComponentContainer implements IComponentContainer {
    private components_ = new Map<Function, Component>()

    public add(component: Component) {
        this.components_.set(component.constructor, component)
    }

    public remove(componentType: Function) {
        this.components_.delete(componentType)
    }

    public get<T extends Component>(component: ComponentConstructor<T>)
        : T {
        return this.components_.get(component) as T
    }

    public has(componentType: Function)
        : boolean {
        return this.components_.has(componentType)
    }

    public hasAll(componentTypes: Set<Function>)
        : boolean {
        for (const componentType of componentTypes) {
            if (!this.has(componentType)) {
                return false
            }
        }
        return true
    }
}

export interface IECS {
    addEntity(entity: Entity): Entity
    removeEntity(entity: Entity): IECS
    addEntityComponent(entity: Entity, component: Component): IECS
    removeEntityComponent(entity: Entity, componentType: Function): IECS
    getEntityComponents(entity: Entity): IComponentContainer
    addSystem(system: ISystem): IECS
    removeSystem(system: ISystem): IECS
    update(): IECS
}

export class ECS {
    private entities_: Map<Entity, ComponentContainer>
    private systems_: Map<ISystem, Set<Entity>>

    private nextEntity_ = 0

    /**************************************************************************
     * Entities management ****************************************************
     *************************************************************************/

    public addEntity()
        : Entity {
        const entity = this.nextEntity_++
        this.entities_.set(entity, new ComponentContainer())
        return entity
    }

    public removeEntity(
        entity: Entity
    ): IECS {
        this.entities_.delete(entity)
        for (const entities of this.systems_.values()) {
            entities.delete(entity)
        }
        return this
    }

    public addEntityComponent<T extends Component>(
        entity: Entity,
        component: Component,
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
        if (!this.entities_.has(entity)) {
            throw new Error(`Entity ${entity} does not exist.`)
        }
        return this.entities_.get(entity)!
    }

    /**************************************************************************
     * Systems management *****************************************************
     *************************************************************************/

    public addSystem(
        system: ISystem
    ): IECS {
        if (system.componentsRequired.size === 0) {
            throw new Error('System must require at least one component.')
        }

        system.ecs = this

        this.systems_.set(system, new Set())
        for (const entity of this.entities_.keys()) {
            this.checkEntitySystem_(entity, system)
        }

        return this
    }

    public removeSystem(
        system: ISystem
    ): IECS {
        this.systems_.delete(system)
        return this
    }

    /**************************************************************************
     * Update *****************************************************************
     *************************************************************************/

    public constructor() {
        this.entities_ = new Map()
        this.systems_ = new Map()
    }

    public update(): IECS {
        for (const [system, entities] of this.systems_.entries()) {
            system.update(entities)
        }
        return this
    }

    private checkEntity_(entity: Entity) {
        for (const system of this.systems_.keys()) {
            this.checkEntitySystem_(entity, system)
        }
        return this
    }

    private checkEntitySystem_(entity: Entity, system: ISystem) {
        const have = this.entities_.get(entity)
        const required = system.componentsRequired
        if (have?.hasAll(required) ?? false) {
            this.systems_.get(system)?.add(entity)
        } else {
            this.systems_.get(system)?.delete(entity)
        }
    }
}
