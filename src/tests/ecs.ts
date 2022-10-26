import {
    expect
} from "chai"

import {
    ECS,
} from "../lib"

describe("ECS", () => {
    describe("#update()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("update")
                .that.is.a("function")
        })
    })
    describe("#addEntity()", () => {
        it("shoud be a method", () => {
            expect(new ECS())
                .to.have.property("addEntity")
                .that.is.a("function")
        })
        it("should return an entity", () => {
            expect(new ECS().addEntity()).to.be.a("number")
        })
        it("must not return the same value twice", () => {
            const ecs = new ECS()
            const entity1 = ecs.addEntity()
            const entity2 = ecs.addEntity()
            expect(entity1).to.not.equal(entity2)
        })
    })
    describe("#hasEntity()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("hasEntity")
                .that.is.a("function")
        })
        it("should return false if the entity has not been added", () => {
            expect(new ECS().hasEntity(0)).to.be.false
        })
        it("should return true if the entity has been added", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()
            expect(ecs.hasEntity(entity)).to.be.true
        })
    })
    describe("#removeEntity()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("removeEntity")
                .that.is.a("function")
        })
        it("should return the ECS", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()
            expect(ecs.removeEntity(entity)).to.equal(ecs)
        })
        it("should not delete the entity immediately after it has been removed", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()
            ecs.removeEntity(entity)
            expect(ecs.hasEntity(entity)).to.be.true
        })
        it("should delete the entity after the next update", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()
            ecs.removeEntity(entity)
            ecs.update()
            expect(ecs.hasEntity(entity)).to.be.false
        })
    })
    describe("#addEntityComponent()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("addEntityComponent")
                .that.is.a("function")
        })
    })
    describe("#removeEntityComponent()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("removeEntityComponent")
                .that.is.a("function")
        })
    })
    describe("#getEntityComponents()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("getEntityComponents")
                .that.is.a("function")
        })
    })
    describe("#getEntityComponent()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("getEntityComponent")
                .that.is.a("function")
        })
    })
    describe("#addSystem()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("addSystem")
                .that.is.a("function")
        })
    })
    describe("#removeSystem()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("removeSystem")
                .that.is.a("function")
        })
    })
})
