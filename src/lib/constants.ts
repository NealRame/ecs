export enum EngineState {
    Paused = 0,
    Running = 1,
    Stopped = 2,
}

export const GameMetadataKey = Symbol("Game metadata key")

export const SystemMetadataKey = Symbol("System metadata key")
export const SystemEventHandlerOnceKey = Symbol("System event handler once key")
