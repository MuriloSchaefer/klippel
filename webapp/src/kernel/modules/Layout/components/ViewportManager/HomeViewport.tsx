import React from "react"
import { ViewportState } from "../../store/state"

const HomeViewport = ({name, title, type, group}:ViewportState) => {
    return <>Home viewport</>
}

export default React.memo(HomeViewport)