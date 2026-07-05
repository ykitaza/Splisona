import { Image, PenTool, Globe } from 'lucide-react';
import type { DesignInput } from '@/features/test/types';

export function DesignSourceInfo({ input, linkable = false }: { input: DesignInput; linkable?: boolean }) {
  if (input.inputType === 'figma_url') {
    const content = (
      <>
        <PenTool size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.figmaUrl ?? 'Figma URL'}</span>
      </>
    );
    return linkable ? (
      <a href={input.figmaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        {content}
      </a>
    ) : (
      <span className="flex items-center gap-1.5 min-w-0 text-text-lo">
        {content}
      </span>
    );
  }
  if (input.inputType === 'site_url') {
    const content = (
      <>
        <Globe size={13} className="text-text-lo flex-shrink-0" />
        <span className="truncate font-mono text-xs">{input.siteUrl ?? 'サイトURL'}</span>
      </>
    );
    return linkable ? (
      <a href={input.siteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 text-text-lo hover:opacity-70 transition-opacity">
        {content}
      </a>
    ) : (
      <span className="flex items-center gap-1.5 min-w-0 text-text-lo">
        {content}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-text-lo">
      <Image size={13} className="flex-shrink-0" />
      <span className="font-mono text-xs">画像アップロード</span>
    </div>
  );
}
