import { UnitValue } from "../typings";
import MoneySlider from "./MoneySlider";
import TimeSlider from "./TimeSlider";

export interface ScaleSliderProps {
  scale: "time" | "money";
  label: string;
  icon: any;
  onChange: (newValue: UnitValue) => void;
  slots?: {
    coumpoundSelector?: React.ReactNode | React.ReactNode[] 
  }
}

export default function ScaleSlider({scale, ...props}: ScaleSliderProps) {
  if (scale === "money") return <MoneySlider {...props}/>
  return <TimeSlider {...props}/>
}
