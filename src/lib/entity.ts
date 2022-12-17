import {
    Service,
    ServiceLifecycle,
} from "@nealrame/ts-injector"

import {
    type IEntityFactory,
} from "./types"

@Service({ lifecycle: ServiceLifecycle.Singleton })
export class BasicEntityFactory implements IEntityFactory {
    private id_ = 1

    public create() {
        return this.id_++
    }

    public createMultiple(count: number) {
        const start = this.id_
        this.id_ = this.id_ + count
        return Array.from({ length: count }, (_, i) => start + i)
    }
}
