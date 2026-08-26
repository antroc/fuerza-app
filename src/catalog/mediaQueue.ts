type Release = () => void;

export class MediaLoadQueue {
  private active = 0;
  private readonly waiting: Array<(release: Release) => void> = [];

  constructor(private readonly maximum: number) {}

  acquire(): Promise<Release> {
    if (this.active < this.maximum) return Promise.resolve(this.start());
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private start(): Release {
    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      const next = this.waiting.shift();
      if (next) next(this.start());
    };
  }
}

export const gifLoadQueue = new MediaLoadQueue(6);
