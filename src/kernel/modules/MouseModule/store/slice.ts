import { createSlice } from "@reduxjs/toolkit";
import {
  floatingDocumentationCollapsed,
  floatingDocumentationExpanded,
  floatingShortcutsClosed,
  floatingShortcutsCreated,
  floatingShortcutsOpened,
} from "./actions";
import { MouseModuleState } from "./state";

const initialMouseModuleState: MouseModuleState = {
  mousePosition: {
    x: 0,
    y: 0,
  },
  documentation: {
    visible: false,
    content: null,
  },
  shortcuts: {},
};

export const MouseModuleSlice = createSlice({
  name: "MouseModule",
  initialState: initialMouseModuleState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(
        floatingDocumentationExpanded,
        (state: MouseModuleState, { payload: { content, x, y } }) => ({
          ...state,
          mousePosition: {
            x,
            y,
          },
          documentation: {
            visible: true,
            content,
          },
        })
      )
      .addCase(floatingDocumentationCollapsed, (state: MouseModuleState) => ({
        ...state,
        documentation: {
          visible: false,
          content: null,
        },
      }))
      .addCase(floatingShortcutsCreated, (state: MouseModuleState, action) => ({
        ...state,
        shortcuts: {
          ...state.shortcuts,
          [action.payload.id]: {
            visible: false,
          },
        },
      }))
      .addCase(floatingShortcutsOpened, (state: MouseModuleState, action) => ({
        ...state,
        mousePosition: {
          x: action.payload.x,
          y: action.payload.y,
        },
        shortcuts: {
          ...state.shortcuts,
          [action.payload.id]: {
            visible: true,
          },
        },
      }))
      .addCase(floatingShortcutsClosed, (state: MouseModuleState, action) => ({
        ...state,
        shortcuts: {
          ...state.shortcuts,
          [action.payload.id]: {
            visible: false,
          },
        },
      }));
  },
});

export default MouseModuleSlice.reducer;
