import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  addGradeToBudget,
  addToBudget,
  changeGradeCounter,
  openDebugView,
  selectPart,
  unselectPart,
} from "./actions";
import { CompositionState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {} as CompositionState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      selectPart,
      (state: CompositionState, { payload: { partName } }) => ({
        ...state,
        selectedPart: partName,
      })
    );
    builder.addCase(
      addToBudget,
      (state: CompositionState, { payload: { budgetId, gradesInfo } }) => ({
        ...state,
        budget: {
          budgetId,
          grades: gradesInfo.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
        },
      })
    );

    builder.addCase(
      addGradeToBudget,
      (state: CompositionState, { payload: { gradeId } }) => ({
        ...state,
        budget: {
          ...state.budget!,
          grades: {...state.budget?.grades, [gradeId]: 0},
        },
      })
    );
    
    builder.addCase(
      changeGradeCounter,
      (state: CompositionState, { payload: { gradeId, counter } }) => ({
        ...state,
        budget: state.budget ? {
          ...state.budget,
          grades: {...state.budget.grades, [gradeId]: counter}
        } : undefined
      })
    );
    builder.addCase(unselectPart, (state: CompositionState) => ({
      ...state,
      selectedPart: undefined,
    }));
    builder.addCase(openDebugView, (state: CompositionState, { payload }) => ({
      ...state,
      debugViewport: payload.debugViewport,
    }));
  },
});

export default slice;
