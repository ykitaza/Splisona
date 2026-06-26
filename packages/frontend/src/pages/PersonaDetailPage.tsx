import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, PencilLine, Send, RotateCcw } from 'lucide-react';
import { getPersona, sendInterviewMessage } from '../api/personas';
import { PERSONA_TYPE_LABELS, type Persona, type ConversationMessage } from '../types';

export function PersonaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoadingPersona, setIsLoadingPersona] = useState(true);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    if (!id || !text.trim()) return;
    const userMessage: ConversationMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInputText('');
    setLastUserMessage(text.trim());
    setIsLoading(true);
    setChatError(null);

    try {
      const content = await sendInterviewMessage(id, newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setIsLoading(false);
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
      <div className="flex items-center justify-center h-full">
        <div role="status" className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="p-8">
        <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>ペルソナが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ overflow: 'hidden' }}>
      {/* Left: Persona Info */}
      <div
        className="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ width: 300, borderRight: '1px solid #E6E6E8', background: '#FFFFFF', padding: '24px 20px', gap: 20 }}
      >
        <div className="flex flex-col gap-1">
          <Link
            to="/personas"
            className="flex items-center gap-1"
            style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}
          >
            <ChevronLeft size={14} color="#9A9A9F" />
            ペルソナ一覧
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 20, fontWeight: 600 }}>
              {persona.displayName}
            </h1>
            {persona.source !== 'default' && (
              <Link
                to={`/personas/${id}/edit`}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5"
                style={{ border: '1px solid #E6E6E8', borderRadius: 6, color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 500 }}
              >
                <PencilLine size={13} color="#666666" />
                編集
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: '行動タイプ', value: (PERSONA_TYPE_LABELS as Record<string, string>)[persona.type] ?? persona.type },
            { label: '年齢', value: persona.age != null ? `${persona.age}歳` : '—' },
            { label: '性別', value: persona.gender ?? '—' },
            { label: '職業', value: persona.occupation ?? '—' },
            { label: '学歴', value: persona.education ?? '—' },
            { label: '偏差値', value: persona.deviationScore != null ? String(persona.deviationScore) : '—' },
            { label: '年収', value: persona.annualIncome != null ? `${persona.annualIncome.toLocaleString()}万円` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>{label}</span>
              <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {persona.freeText && (
          <div className="flex flex-col gap-2">
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 11, letterSpacing: '0.5px' }}>
              人物像・行動特性
            </span>
            <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 13, lineHeight: 1.6 }}>
              {persona.freeText}
            </p>
          </div>
        )}
      </div>

      {/* Right: Interview Chat */}
      <div className="flex flex-col flex-1" style={{ overflow: 'hidden', background: '#F7F7F8' }}>
        {/* Chat header */}
        <div
          className="flex items-center px-6 py-4 flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E6E8' }}
        >
          <div className="flex flex-col gap-0.5">
            <span style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 15, fontWeight: 600 }}>
              インタビュー
            </span>
            <span style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 12 }}>
              {persona.displayName} として回答します
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && !isLoading && !chatError && (
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <p style={{ color: '#9A9A9F', fontFamily: 'Geist, sans-serif', fontSize: 14 }}>
                {persona.displayName}に話しかけてみましょう
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-md rounded-xl px-4 py-3 text-sm"
                style={{
                  background: msg.role === 'user' ? '#1A1A1A' : '#FFFFFF',
                  color: msg.role === 'user' ? '#FFFFFF' : '#1A1A1A',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1px solid #E6E6E8' : 'none',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3" style={{ background: '#FFFFFF', border: '1px solid #E6E6E8' }}>
                <div role="status" className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#9A9A9F' }} />
              </div>
            </div>
          )}

          {chatError && (
            <div className="flex flex-col items-start gap-2">
              <p style={{ color: '#D64545', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>{chatError}</p>
              <button
                onClick={() => sendMessage(lastUserMessage)}
                className="flex items-center gap-1"
                style={{ color: '#3B7DD8', fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RotateCcw size={12} color="#3B7DD8" />
                再試行
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-6 py-4 flex items-end gap-3"
          style={{ background: '#FFFFFF', borderTop: '1px solid #E6E6E8' }}
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="メッセージを入力（Enter で送信、Shift+Enter で改行）"
            rows={2}
            className="flex-1 rounded-md px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-[#3B7DD8]"
            style={{ border: '1px solid #E6E6E8', borderRadius: 6, fontFamily: 'Geist, sans-serif', fontSize: 14, color: '#1A1A1A', background: '#F7F7F8' }}
          />
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center justify-center rounded-md flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: '#0A0A0A', width: 40, height: 40, borderRadius: 8 }}
          >
            <Send size={16} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
