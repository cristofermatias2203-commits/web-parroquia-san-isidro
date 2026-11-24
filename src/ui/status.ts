import { translateWith } from '../i18n/translate';

type StatusType = 'info' | 'success' | 'error';

interface StatusState {
  source: string;
  vars: Record<string, string | Node>;
  type: StatusType | null;
}

/** Estados accesibles que se vuelven a traducir al cambiar de idioma (#58). */
export class StatusController {
  private state: StatusState | null = null;
  private timer: number | undefined;

  constructor(private readonly element: HTMLElement | null) {}

  show(source: string, type: StatusType | null = null, vars: Record<string, string | Node> = {}): void {
    this.state = { source, vars, type };
    this.render();
  }

  clear(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.state = null;
    if (this.element) {
      this.element.replaceChildren();
      this.element.hidden = true;
    }
  }

  /** El último mensaje gana siempre: cancela el temporizador anterior (#62). */
  schedule(source: string, delay: number, vars: Record<string, string | Node> = {}): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.show(source, 'info', vars);
    }, delay);
  }

  retranslate(): void {
    if (this.state) this.render();
  }

  private render(): void {
    const element = this.element;
    const state = this.state;
    if (!element || !state) return;

    element.replaceChildren();
    const message = translateWith(state.source, state.vars);
    if (typeof message === 'string') element.append(document.createTextNode(message));
    else element.append(message);

    element.classList.remove('is-info', 'is-success', 'is-error');
    if (state.type) element.classList.add(`is-${state.type}`);
    element.hidden = false;
  }
}
