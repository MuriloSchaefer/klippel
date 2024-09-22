import { useEffect, useState } from "react";
import { WORKSPACES_COLLECTION } from "../constants";
import { Workspace } from "../schemas/Workspace";
import useCollection from "./useCollection";

export default function () {
  const workspaces = useCollection<Workspace>(WORKSPACES_COLLECTION);
  const [curr, setCurr] = useState<Workspace|null>(null)

  useEffect(()=>{
    workspaces?.findOne({ selector: { isCurrent: true } }).$.subscribe((data)=>{
      if(data){
        setCurr({...data._data, logo: data.logo?.replaceAll("{homeDir}", data.homeDir)})
      }
    })
  },[workspaces])

  return curr
}
