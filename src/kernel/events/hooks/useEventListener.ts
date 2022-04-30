import { useEffect } from "react";

function useCustomEventListener<T>(
  eventName: string,
  eventHandler: (data: T) => void
): void {
  useEffect(() => {
    const manager = document.getElementById("EventManager");
    if (!manager) throw Error("No EventManager found");

    const handleEvent = (event: CustomEvent | Event) => {
      const data = (event as CustomEvent).detail;
      eventHandler(data);
    };

    manager.addEventListener(eventName, handleEvent, false);

    return () => {
      manager.removeEventListener(eventName, handleEvent, false);
    };
  });
}

export default useCustomEventListener;
