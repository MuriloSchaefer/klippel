import { useContext } from "react";
import { EditorToolkitContext } from "../components/SVGEditorToolkit";



export default function useSVGEditorToolkit() {
    return useContext(EditorToolkitContext)
}