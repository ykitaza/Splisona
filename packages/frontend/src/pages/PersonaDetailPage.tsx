import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { getPersona, sendInterviewMessage } from '../api/personas';
import { PERSONA_TYPE_LABELS, type Persona, type ConversationMessage } from '../types';

export function PersonaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoadingPersona, setIsLoadingPersona] = useState(true);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getPersona(id)
      .then(setPersona)
      .finally(() => setIsLoadingPersona(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function sendMessage(text: string) {
    if (!id || !text.trim()) return;
    const userMessage: ConversationMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInputText('');
    setLastUserMessage(text.trim());
    setIsStreaming(true);
    setStreamingText('');
    setChatError(null);

    try {
      const stream = await sendInterviewMessage(id, newMessages);
      if (!stream) throw new Error('ストリームが取得できませんでした');

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingText(accumulated);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
      setStreamingText('');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  if (isLoadingPersona) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!persona) {
    return <div className="p-8 text-gray-500">ペルソナが見つかりません</div>;
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* ペルソナ情報ヘッダー */}
      <div className="border-b bg-white px-6 py-4">
        <p className="text-xl font-bold text-gray-900">{persona.displayName}</p>
        <p className="text-sm text-gray-500">{PERSONA_TYPE_LABELS[persona.type]}{persona.occupation ? ` / ${persona.occupation}` : ''}</p>
        {persona.freeText && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{persona.freeText}</p>
        )}
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && !chatError && (
          <p className="text-center text-sm text-gray-400 mt-8">
            {persona.displayName}に話しかけてみましょう
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-xs rounded-lg px-4 py-2 text-sm bg-gray-100 text-gray-900">
              {streamingText}
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div role="status" className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 ml-2 mt-2" />
          </div>
        )}

        {chatError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600">{chatError}</p>
            <button
              onClick={() => sendMessage(lastUserMessage)}
              className="text-sm text-indigo-600 hover:underline"
            >
              再試行
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t bg-white px-6 py-4">
        <div className="flex gap-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="メッセージを入力（Enterで送信）"
            rows={2}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm resize-none disabled:bg-gray-50"
          />
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isStreaming || !inputText.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 self-end"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
