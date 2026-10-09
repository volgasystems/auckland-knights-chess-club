import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MeetingSummary({ text }: { text: string }) {
  return <div className="mt-6 min-w-0 space-y-4 text-base leading-7 text-slate-700 [overflow-wrap:anywhere]">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h3 className="mt-8 text-2xl font-bold text-slate-900">{children}</h3>,
      h2: ({ children }) => <h3 className="mt-7 border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">{children}</h3>,
      h3: ({ children }) => <h4 className="mt-6 text-lg font-bold text-slate-900">{children}</h4>,
      p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
      ul: ({ children }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal space-y-2 pl-6">{children}</ol>,
      table: ({ children }) => <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[480px] border-collapse text-left text-sm">{children}</table></div>,
      th: ({ children }) => <th className="border-b border-slate-200 bg-slate-100 px-4 py-3 font-bold">{children}</th>,
      td: ({ children }) => <td className="border-b border-slate-200 px-4 py-3 align-top">{children}</td>,
      a: ({ href, children }) => <a href={href} className="font-medium text-akcc-blue underline underline-offset-2">{children}</a>,
      blockquote: ({ children }) => <blockquote className="border-l-4 border-akcc-gold pl-4 italic">{children}</blockquote>,
    }}>{text || ""}</ReactMarkdown>
  </div>;
}
