import { AnyAction, Dispatch } from "redux";

const createGraph =
  ({ dispatch }: { dispatch: Dispatch }) =>
  (next: Dispatch<AnyAction>) =>
  (action: AnyAction) => {
    if (action.type === "graphs/newGraph") {
      const { graphId } = action.payload;
      dispatch({ type: "new", payload: { graphId } });
    }
    return next(action);
  };

export default createGraph;
