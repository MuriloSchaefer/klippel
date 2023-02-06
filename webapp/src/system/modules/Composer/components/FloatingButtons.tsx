import { Box, ButtonGroup, Button } from "@mui/material"
import SplitButton from "./SplitButton"

const FloatingButtons = () => {
    return <Box sx={{position: 'absolute', bottom: 10, right: 10}}>
    <SplitButton />
    </Box>
}

export default FloatingButtons