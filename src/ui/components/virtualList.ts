// Fixed-row-height virtualised list: only the visible rows (+ overscan) exist in the DOM.

export interface VirtualListOptions<T> {
  rowHeight: number;
  render: (item: T, index: number) => HTMLElement;
  onSelect?: (item: T, index: number) => void;
  overscan?: number;
}

export class VirtualList<T> {
  readonly el: HTMLDivElement;
  private spacer: HTMLDivElement;
  private items: T[] = [];
  private selected = -1;
  private raf = 0;

  constructor(private opts: VirtualListOptions<T>) {
    this.el = document.createElement('div');
    this.el.className = 'vlist';
    this.spacer = document.createElement('div');
    this.spacer.className = 'spacer';
    this.el.append(this.spacer);
    this.el.addEventListener('scroll', () => this.schedule(), { passive: true });
    new ResizeObserver(() => this.schedule()).observe(this.el);
  }

  setItems(items: T[]): void {
    this.items = items;
    this.selected = -1;
    this.el.scrollTop = 0;
    this.spacer.style.height = `${items.length * this.opts.rowHeight}px`;
    this.draw();
  }

  private schedule(): void {
    if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }

  private draw(): void {
    const { rowHeight, overscan = 6 } = this.opts;
    const top = this.el.scrollTop;
    const height = this.el.clientHeight || 600;
    const first = Math.max(0, Math.floor(top / rowHeight) - overscan);
    const last = Math.min(this.items.length, Math.ceil((top + height) / rowHeight) + overscan);
    this.spacer.replaceChildren();
    for (let i = first; i < last; i++) {
      const row = this.opts.render(this.items[i], i);
      row.classList.add('vrow');
      if (i === this.selected) row.classList.add('sel');
      row.style.top = `${i * rowHeight}px`;
      row.addEventListener('click', () => {
        this.selected = i;
        this.draw();
        this.opts.onSelect?.(this.items[i], i);
      });
      this.spacer.append(row);
    }
  }
}
