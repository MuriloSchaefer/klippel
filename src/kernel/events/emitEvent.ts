function emitCustomEvent<T>(eventName: string, data?: T): void {
  const event = new CustomEvent(eventName, { detail: data });

  const manager = document.getElementById("EventManager");
  if (!manager) throw Error("No EventManager found");
  manager.dispatchEvent(event);
}

export default emitCustomEvent;
