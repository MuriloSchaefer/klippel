import { useLayoutEffect } from "react"
import Markdown, { Options } from 'react-markdown'
import remarkGfm from 'remark-gfm';

import useMarkdownManager from "../hooks/useMarkdownManager"
import useMarkdown from "../hooks/useMarkdown"



export default ({path, ...props}: Options & {path: string}) => {
    const manager = useMarkdownManager()

    useLayoutEffect(()=> {
        manager.loadMarkdown(path)
    }, [path])

    const md = useMarkdown(path)

    if (!md || md.progress !== "completed") return <></> // TODO: add loading

    return <Markdown {...props} remarkPlugins={[remarkGfm]}>{md.content}</Markdown>
}