import { Box } from "@mui/material"
import SplitButton from "./SplitButton"

const FloatingButtons = () => {
    return <Box sx={{position: 'absolute', bottom: 70, right: 10}}>
    <SplitButton />
    </Box>
}

export default FloatingButtons