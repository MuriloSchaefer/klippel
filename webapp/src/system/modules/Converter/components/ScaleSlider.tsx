import { UnitValue } from "../typings";
import MoneySlider from "./MoneySlider";
import TimeSlider from "./TimeSlider";


export default function ScaleSlider({
  scale,
  label,
  icon,
  onChange
}: {
  scale: "time" | "money";
  label: string;
  icon: any;
  onChange: (newValue: UnitValue) => void;
}) {
  if (scale === "money") return <MoneySlider label={label} icon={icon} onChange={onChange}/>
  return <TimeSlider label={label} icon={icon} onChange={onChange}/>
}
