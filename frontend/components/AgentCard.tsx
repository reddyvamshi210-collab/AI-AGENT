interface AgentCardProps {
  title: string;
  subtitle: string;
  badge?: string;
  url?: string;
}

export function AgentCard({ title, subtitle, badge, url }: AgentCardProps) {
  const content = (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-brand-500/30 hover:bg-white/[0.07] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-200 text-sm">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {badge && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/15 text-brand-300 border border-brand-500/20">
            {badge}
          </span>
        )}
      </div>
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
