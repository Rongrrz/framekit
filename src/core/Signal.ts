export interface SignalConnection {
  readonly Connected: boolean;
  Disconnect(): void;
}

export class Signal<Arguments extends unknown[] = []> {
  readonly #listeners = new Set<(...args: Arguments) => void>();
  #destroyed = false;

  public Connect(callback: (...args: Arguments) => void): SignalConnection {
    if (this.#destroyed) throw new Error('Cannot connect to a destroyed Signal.');
    this.#listeners.add(callback);

    let connected = true;
    return {
      get Connected(): boolean {
        return connected;
      },
      Disconnect: () => {
        if (!connected) return;
        connected = false;
        this.#listeners.delete(callback);
      },
    };
  }

  public Fire(...args: Arguments): void {
    if (this.#destroyed) return;
    for (const callback of Array.from(this.#listeners)) callback(...args);
  }

  public DisconnectAll(): void {
    this.#listeners.clear();
  }

  public Destroy(): void {
    this.DisconnectAll();
    this.#destroyed = true;
  }
}
