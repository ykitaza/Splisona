interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 font-sans text-sm ${
          isUser
            ? 'bg-accent text-text-hi'
            : 'bg-raised text-text-hi'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
