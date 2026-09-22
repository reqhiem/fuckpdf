import type { EditElement, EditElementType } from '@fuckpdf/tools'
import { create } from 'zustand'

export type EditorTool = 'select' | EditElementType

/** Bounded so an undone image is not pinned for the life of the tab. */
export const HISTORY_LIMIT = 50

export type EditPatch = Partial<EditElement>

export type EditorStore = {
  elements: EditElement[]
  selectedId: string | null
  activeTool: EditorTool
  page: number
  past: EditElement[][]
  future: EditElement[][]

  setTool: (tool: EditorTool) => void
  setPage: (page: number) => void
  select: (id: string | null) => void
  add: (element: EditElement) => void
  /** `record: false` skips history: the frame-by-frame path, after one `snapshot()`. */
  update: (id: string, changes: EditPatch, record?: boolean) => void
  remove: (id: string) => void
  snapshot: () => void
  undo: () => void
  redo: () => void
  reset: () => void
}

const push = (stack: EditElement[][], elements: EditElement[]): EditElement[][] =>
  [...stack, elements].slice(-HISTORY_LIMIT)

const initial = {
  elements: [] as EditElement[],
  selectedId: null as string | null,
  activeTool: 'select' as EditorTool,
  page: 1,
  past: [] as EditElement[][],
  future: [] as EditElement[][],
}

const keepSelection = (elements: EditElement[], selectedId: string | null) =>
  selectedId && elements.some((element) => element.id === selectedId) ? selectedId : null

export const useEditorStore = create<EditorStore>()((set) => ({
  ...initial,

  setTool: (activeTool) => set({ activeTool }),
  setPage: (page) => set({ page }),
  select: (selectedId) => set({ selectedId }),

  add: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      past: push(state.past, state.elements),
      future: [],
      selectedId: element.id,
    })),

  update: (id, changes, record = true) =>
    set((state) => ({
      elements: state.elements.map((element) =>
        element.id === id ? ({ ...element, ...changes } as EditElement) : element,
      ),
      ...(record ? { past: push(state.past, state.elements), future: [] } : {}),
    })),

  remove: (id) =>
    set((state) => ({
      elements: state.elements.filter((element) => element.id !== id),
      past: push(state.past, state.elements),
      future: [],
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  snapshot: () => set((state) => ({ past: push(state.past, state.elements), future: [] })),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        elements: previous,
        past: state.past.slice(0, -1),
        future: [state.elements, ...state.future].slice(0, HISTORY_LIMIT),
        selectedId: keepSelection(previous, state.selectedId),
      }
    }),

  redo: () =>
    set((state) => {
      const [next, ...rest] = state.future
      if (!next) return state
      return {
        elements: next,
        past: push(state.past, state.elements),
        future: rest,
        selectedId: keepSelection(next, state.selectedId),
      }
    }),

  reset: () => set({ ...initial }),
}))
