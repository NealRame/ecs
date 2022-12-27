import {
    expect
} from "chai"

import {
    BasicEntityFactory
} from "../../lib/entity"

describe("BasicEntityFactory", () => {
    describe("#create(): TEntity", () => {
        it("should be a method", () => {
            const factory = new BasicEntityFactory()
            expect(factory)
                .to.have.property("create")
                .that.is.a("function")
        })
        it("should return an entity", () => {
            const factory = new BasicEntityFactory()
            expect(factory.create())
                .to.be.a("number")
        })
        it("must not return the same value twice", () => {
            const factory = new BasicEntityFactory()
            const entity1 = factory.create()
            const entity2 = factory.create()
            expect(entity1)
                .to.not.equal(entity2)
        })
    })
    describe("#createMultiple(count: number): Array<TEntity>", () => {
        it("should be a method", () => {
            const factory = new BasicEntityFactory()
            expect(factory)
                .to.have.property("createMultiple")
                .that.is.a("function")
        })
        it("should return an array of entities", () => {
            const factory = new BasicEntityFactory()
            const entities = factory.createMultiple(10)
            expect(entities).to.be.an("array")
            entities.forEach(entity => expect(entity).to.be.a("number"))
        })
        it("should return an array of the given length", () => {
            const factory = new BasicEntityFactory()
            const entities = factory.createMultiple(10)
            expect(entities).to.have.lengthOf(10)
        })
        it("must not return the same value twice", () => {
            const factory = new BasicEntityFactory()
            const entities1 = factory.createMultiple(10)
            const entities2 = factory.createMultiple(10)
            expect(entities1).to.not.deep.equal(entities2)
        })
    })
})