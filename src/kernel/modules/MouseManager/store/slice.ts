import { createSlice } from "@reduxjs/toolkit";
import {
  floatingDocumentationCollapsed,
  floatingDocumentationExpanded,
  floatingShortcutsClosed,
  floatingShortcutsCreated,
  floatingShortcutsOpened,
} from "./actions";
import { MouseManagerState } from "./state";

const initialMouseManagerState: MouseManagerState = {
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

export const MouseManagerSlice = createSlice({
  name: "MouseManagerUI",
  initialState: initialMouseManagerState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(
        floatingDocumentationExpanded,
        (state: MouseManagerState, { payload: { content, x, y } }) => ({
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
      .addCase(floatingDocumentationCollapsed, (state: MouseManagerState) => ({
        ...state,
        documentation: {
          visible: false,
          content: null,
        },
      }))
      .addCase(
        floatingShortcutsCreated,
        (state: MouseManagerState, action) => ({
          ...state,
          shortcuts: {
            ...state.shortcuts,
            [action.payload.id]: {
              visible: false,
            },
          },
        })
      )
      .addCase(floatingShortcutsOpened, (state: MouseManagerState, action) => ({
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
      .addCase(floatingShortcutsClosed, (state: MouseManagerState, action) => ({
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

export default MouseManagerSlice.reducer;
