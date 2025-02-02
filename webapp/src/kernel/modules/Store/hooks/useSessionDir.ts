import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"

const SESSION_PATH='/session'



export default function(){
  const storeModule = useModule<Store>('Store')
  const sessionDir = storeModule.hooks.useDirectory('/.session')
  return sessionDir
}