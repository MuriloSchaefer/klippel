import { TIME_SCALE } from "../constants";

export const useScales = () => {
  return {
    time: Object.entries(TIME_SCALE).map(([unit, label]) => ({
      value: unit,
      label,
    }))
  };
};
