import type {
    IEntityFactory
} from "./types"

export function BasicEntityFactory(): IEntityFactory {
    let id = 0
    return {
        async create() {
            return id++
        },
        async bulkCreate(count: number) {
            const start = id
            id = id + count
            return Array.from({ length: count }, (_, i) => start + i)
        },
    }
}
