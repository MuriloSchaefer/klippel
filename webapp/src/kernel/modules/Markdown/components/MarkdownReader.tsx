import { useLayoutEffect } from "react";
import Markdown, { Options } from "react-markdown";
import remarkGfm from "remark-gfm";

import useMarkdownManager from "../hooks/useMarkdownManager";
import useMarkdown from "../hooks/useMarkdown";

type ExternalMDReaderProps = Options & { path: string };
type InternalMDReaderProps = Options & { content: string };

const ExternalMDReader = ({ path, ...props }: ExternalMDReaderProps) => {
  const manager = useMarkdownManager();

  useLayoutEffect(() => {
    if (path) manager.loadMarkdown(path);
  }, [path]);

  const md = useMarkdown(path);

  if (!md || md.progress !== "completed") return <></>; // TODO: add loading

  return (
    <Markdown {...props} remarkPlugins={[remarkGfm]}>
      {md.content}
    </Markdown>
  );
};

const InternalMDReader = ({ content, ...props }: InternalMDReaderProps) => {
  return (
    <Markdown {...props} remarkPlugins={[remarkGfm]}>
      {content}
    </Markdown>
  );
};

export default (props: ExternalMDReaderProps | InternalMDReaderProps) => {
  if ("path" in props) return <ExternalMDReader {...props} />;
  return <InternalMDReader {...props} />;
};
