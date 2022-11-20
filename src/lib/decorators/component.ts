import {
    Service,
    TConstructor,
} from "@nealrame/ts-injector"

export function Component(target: TConstructor) {
    return Service()(target)
}
