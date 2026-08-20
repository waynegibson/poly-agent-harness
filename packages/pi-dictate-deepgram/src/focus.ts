import type { TuiInputListener } from "@earendil-works/pi-tui";

interface EditorLike {
  getText(): string;
  setText(text: string): void;
}

export interface RuntimeTui {
  addInputListener(listener: TuiInputListener): () => void;
  requestRender(): void;
  getFocusedComponent(): unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asEditor(value: unknown): EditorLike | null {
  if (!isRecord(value)) return null;
  const getText = value.getText;
  const setText = value.setText;
  if (typeof getText !== "function" || typeof setText !== "function") return null;
  return {
    getText: () => {
      const result: unknown = getText.call(value);
      return typeof result === "string" ? result : "";
    },
    setText: (text) => setText.call(value, text),
  };
}

/**
 * Pi does not currently expose focusedComponent in its public TUI interface.
 * Keep this narrow, validated adapter as the only compatibility boundary.
 */
export function createRuntimeTui(value: unknown): RuntimeTui | null {
  if (!isRecord(value)) return null;
  const addInputListener = value.addInputListener;
  const requestRender = value.requestRender;
  if (typeof addInputListener !== "function" || typeof requestRender !== "function") return null;

  return {
    addInputListener(listener) {
      const result: unknown = addInputListener.call(value, listener);
      return typeof result === "function" ? () => void result() : () => undefined;
    },
    requestRender: () => requestRender.call(value),
    getFocusedComponent: () => value.focusedComponent,
  };
}

export function resolveFocusedEditor(tui: RuntimeTui): EditorLike | null {
  const focused = tui.getFocusedComponent();
  const direct = asEditor(focused);
  if (direct) return direct;
  return isRecord(focused) ? asEditor(focused.editor) : null;
}

export function appendToEditor(editor: EditorLike, transcript: string): void {
  const current = editor.getText();
  const separator = current && !/\s$/.test(current) ? " " : "";
  editor.setText(`${current}${separator}${transcript}`);
}
