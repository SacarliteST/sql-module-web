import { Box } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  children: string;
};

export function SafeMarkdown({ children }: Props) {
  return <Box className="safe-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: () => null,
        a: ({ children: linkChildren, ...props }) => <a {...props} rel="noopener noreferrer" target="_blank">{linkChildren}</a>,
      }}
    >{children}</ReactMarkdown>
  </Box>;
}
