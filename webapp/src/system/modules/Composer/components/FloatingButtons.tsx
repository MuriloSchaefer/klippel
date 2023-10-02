import React from "react"
import Box from "@mui/material/Box"
import SplitButton from "./SplitButton"

const FloatingButtons = () => {
    return <Box sx={{position: 'absolute', bottom: 10, right: 10}}>
    <SplitButton />
    </Box>
}

export default React.memo(FloatingButtons)