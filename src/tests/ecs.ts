import {
    expect
} from "chai"

import {
    Component,
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
        it("should add a given component to a given entity", () => {
            const SomeComponent = class extends Component {}
            const ecs = new ECS()
            const entity = ecs.addEntity()

            ecs.addEntityComponent(entity, new SomeComponent)

            const components = ecs.getEntityComponents(entity)

            expect(components.has(SomeComponent)).to.be.true
        })
    })
    describe("#removeEntityComponent()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("removeEntityComponent")
                .that.is.a("function")
        })
        it("should remove a given component from a given entity", () => {
            const SomeComponent = class extends Component {}
            const ecs = new ECS()
            const entity = ecs.addEntity()

            ecs.addEntityComponent(entity, new SomeComponent)
            ecs.removeEntityComponent(entity, SomeComponent)

            const components = ecs.getEntityComponents(entity)

            expect(components.has(SomeComponent)).to.be.false
        })
    })
    describe("#getEntityComponents()", () => {
        it("should be a method", () => {
            expect(new ECS())
                .to.have.property("getEntityComponents")
                .that.is.a("function")
        })
        it("should return an IComponentContainer object", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()
            const components = ecs.getEntityComponents(entity)
            expect(components).to.be.an("object")

            expect(components)
                .to.have.property("has")
                .that.is.a("function")
            expect(components)
                .to.have.property("hasAll")
                .that.is.a("function")
        })
        describe("IComponentContainer", () => {
            const ecs = new ECS()
            const entity = ecs.addEntity()

            const SomeComponent1 = class extends Component {}
            const SomeComponent2 = class extends Component {}
            const SomeComponent3 = class extends Component {}

            ecs.addEntityComponent(entity, new SomeComponent1)
            ecs.addEntityComponent(entity, new SomeComponent2)

            const components = ecs.getEntityComponents(entity)

            describe("#get", () => {
                it("should be a method", () => {
                    expect(components)
                        .to.have.property("get")
                        .that.is.a("function")
                })
                it("should return the component if it exists", () => {
                    expect(components.get(SomeComponent1))
                        .to.be.an.instanceof(SomeComponent1)
                })
                it("should throw an error if the component does not exist", () => {
                    expect(() => components.get(SomeComponent3)).to.throw()
                })
            })
            describe("#has", () => {
                it("should be a method", () => {
                    expect(components)
                        .to.have.property("has")
                        .that.is.a("function")
                })
                it("should return true if entity has the given component", () => {
                    expect(components.has(SomeComponent1))
                        .to.be.true
                })
                it("should return false if entity does not have the given component", () => {
                    expect(components.has(SomeComponent3))
                        .to.be.false
                })
            })
            describe("#hasAll", () => {
                it("should be a method", () => {
                    expect(components)
                        .to.have.property("hasAll")
                        .that.is.a("function")
                })
                it("should return true if entity has all components", () => {
                    expect(components.hasAll([SomeComponent1, SomeComponent2]))
                        .to.be.true
                })
                it("should return false if entity does not have all components", () => {
                    expect(components.hasAll([SomeComponent1, SomeComponent3]))
                        .to.be.false
                })
            })
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
