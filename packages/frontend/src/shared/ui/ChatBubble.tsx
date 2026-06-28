interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  displayName?: string;
  avatarColor?: string;
}

export function ChatBubble({ role, content, displayName, avatarColor }: ChatBubbleProps) {
  const isUser = role === 'user';
  const speakerName = isUser ? 'あなた' : (displayName ?? 'アシスタント');
  const initial = speakerName.charAt(0);
  const bgColor = isUser ? '#1C1F23' : (avatarColor ?? '#1C1F23');

  return (
    <div className="flex justify-start" style={{ gap: 10 }}>
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0 font-sans font-semibold text-white"
        style={{ width: 28, height: 28, fontSize: 12, backgroundColor: bgColor }}
      >
        {initial}
      </div>
      <div className="flex flex-col" style={{ gap: 4, maxWidth: '80%' }}>
        <span className="font-sans text-text-lo" style={{ fontSize: 12 }}>{speakerName}</span>
        <div
          className={`font-sans text-sm text-text-hi ${
            isUser ? 'bg-surface' : 'bg-raised'
          }`}
          style={{ borderRadius: 10, padding: 12 }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
