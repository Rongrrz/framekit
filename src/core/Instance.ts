export class Instance {
  #name: string;
  #parent: Instance | undefined;
  readonly #children: Instance[] = [];
  #destroyed = false;

  public constructor(name?: string) {
    this.#name = name ?? this.constructor.name;
  }

  public get Name(): string {
    return this.#name;
  }

  public set Name(value: string) {
    this.assertAlive();
    this.#name = value;
  }

  public get Parent(): Instance | undefined {
    return this.#parent;
  }

  public set Parent(parent: Instance | undefined) {
    this.assertAlive();
    if (parent && parent.#destroyed) throw new Error('Cannot parent to a destroyed Instance.');
    if (parent === this || parent?.isDescendantOf(this)) {
      throw new Error('An Instance cannot be parented to itself or one of its descendants.');
    }
    if (parent === this.#parent) return;

    const previous = this.#parent;
    if (previous) previous.#children.splice(previous.#children.indexOf(this), 1);
    this.#parent = parent;
    if (parent) parent.#children.push(this);
    this.onParentChanged(previous, parent);
  }

  public GetChildren(): Instance[] {
    return [...this.#children];
  }

  public FindFirstChild(name: string, recursive = false): Instance | undefined {
    const direct = this.#children.find((child) => child.Name === name);
    if (direct || !recursive) return direct;
    for (const child of this.#children) {
      const found = child.FindFirstChild(name, true);
      if (found) return found;
    }
    return undefined;
  }

  public Destroy(): void {
    if (this.#destroyed) return;
    while (this.#children.length > 0) this.#children[0]?.Destroy();
    this.Parent = undefined;
    this.#destroyed = true;
    this.onDestroy();
  }

  public get IsDestroyed(): boolean {
    return this.#destroyed;
  }

  protected onParentChanged(_previous: Instance | undefined, _next: Instance | undefined): void {}

  protected onDestroy(): void {}

  protected assertAlive(): void {
    if (this.#destroyed) throw new Error(`${this.constructor.name} has been destroyed.`);
  }

  private isDescendantOf(instance: Instance): boolean {
    for (let current = this.#parent; current; current = current.#parent) {
      if (current === instance) return true;
    }
    return false;
  }
}
