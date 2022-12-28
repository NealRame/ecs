import {
    expect
} from "chai"

import {
    Registry,
} from "../../lib/registry"

import type {
    TEntity,
} from "../../lib/types"

describe("Registry", () => {
    describe("#createEntity(): TEntity", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("createEntity")
                .that.is.a("function")
        })
        it("should return an entity", () => {
            const registry = new Registry()
            expect(registry.createEntity())
                .to.be.a("number")
        })
        it("must not return the same value twice", () => {
            const registry = new Registry()
            const entity1 = registry.createEntity()
            const entity2 = registry.createEntity()
            expect(entity1)
                .to.not.equal(entity2)
        })
    })
    describe("#createEntities(count: number): Array<TEntity>", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("createEntities")
                .that.is.a("function")
        })
        it("should return an array of entities", () => {
            const registry = new Registry()
            const entities = registry.createEntities(10)
            expect(entities).to.be.an("array")
            entities.forEach(entity => expect(entity).to.be.a("number"))
        })
        it("should return an array of the given length", () => {
            const registry = new Registry()
            const entities = registry.createEntities(10)
            expect(entities).to.have.lengthOf(10)
        })
        it("must not return the same value twice", () => {
            const registry = new Registry()
            const entities1 = registry.createEntities(10)
            const entities2 = registry.createEntities(10)
            expect(entities1).to.not.deep.equal(entities2)
        })
    })
    describe("#hasEntity(entity: TEntity): boolean", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("hasEntity")
                .that.is.a("function")
        })
        it("should return true for an existing entity", () => {
            const registry = new Registry()
            const entity = registry.createEntity()
            expect(registry.hasEntity(entity))
                .to.be.true
        })
        it("should return false for a non-existing entity", () => {
            const registry = new Registry()
            const entity: TEntity = 0
            expect(registry.hasEntity(entity))
                .to.be.false
        })
    })
    describe("#removeEntity(entity: TEntity): void", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("removeEntity")
                .that.is.a("function")
        })
        it("should not throw an error", () => {
            const registry = new Registry()
            expect(() => registry.removeEntity(registry.createEntity()))
                .to.not.throw()
        })
        it("should not throw an error when called twice", () => {
            const registry = new Registry()
            const entity = registry.createEntity()
            expect(() => {
                registry.removeEntity(entity)
                registry.removeEntity(entity)
            }).to.not.throw()
        })
        it("should effectively remove the entity", () => {
            const registry = new Registry()
            const entity = registry.createEntity()
            registry.removeEntity(entity)
            expect(registry.hasEntity(entity))
                .to.be.false
        })
    })
    describe("#removeEntities(entities: Array<TEntity>): void", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("removeEntities")
                .that.is.a("function")
        })
        it("should not throw an error", () => {
            const registry = new Registry()
            expect(() => registry.removeEntities(registry.createEntities(10)))
                .to.not.throw()
        })
        it("should not throw an error when called twice", () => {
            const registry = new Registry()
            const entities = registry.createEntities(10)
            expect(() => {
                registry.removeEntities(entities)
                registry.removeEntities(entities)
            }).to.not.throw()
        })
        it("should effectively remove the entities", () => {
            const registry = new Registry()
            const entities = registry.createEntities(10)
            registry.removeEntities(entities)
            entities.forEach(entity => expect(registry.hasEntity(entity)).to.be.false)
        })
    })
    describe("#removeAllEntities(): void", () => {
        it("should be a method", () => {
            const registry = new Registry()
            expect(registry)
                .to.have.property("removeAllEntities")
                .that.is.a("function")
        })
        it("should not throw an error", () => {
            const registry = new Registry()
            expect(() => registry.removeAllEntities())
                .to.not.throw()
        })
        it("should not throw an error when called twice", () => {
            const registry = new Registry()
            expect(() => {
                registry.removeAllEntities()
                registry.removeAllEntities()
            }).to.not.throw()
        })
        it("should effectively remove all entities", () => {
            const registry = new Registry()
            const entity1 = registry.createEntity()
            const entity2 = registry.createEntity()
            registry.removeAllEntities()
            expect(registry.hasEntity(entity1)).to.be.false
            expect(registry.hasEntity(entity2)).to.be.false
        })
    })
})