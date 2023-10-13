
export type Loader = 'not-started' | 'started' | 'completed'

export type MarkdownState = {
    path: string,
    progress: Loader,
    content: string | null
}

export type MarkdownModuleState = {
    markdowns: {
        [path: string]: MarkdownState
    }
}

export const initialMarkdownState: Pick<MarkdownState, 'progress'|'content'> = {
    progress: "not-started",
    content: null
}

const initialModuleState: MarkdownModuleState = {
    markdowns: {}
}

export default initialModuleState