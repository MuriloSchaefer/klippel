import { IServiceWorkerManager } from "../interfaces";

/**
 * Retrieves the service worker manager.
 * @returns {IServiceWorkerManager} An object that exposes actions to the Service worker.
 */
export const useServiceWorkerManager = (): IServiceWorkerManager => ({
  state: null,
  actions: {},
});

export default useServiceWorkerManager;
