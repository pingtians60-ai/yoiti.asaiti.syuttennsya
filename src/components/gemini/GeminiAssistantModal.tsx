import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Settings, 
  Copy, 
  Check, 
  Trash2, 
  User, 
  FileText, 
  Flame, 
  LayoutGrid, 
  AlertCircle,
  HelpCircle,
  Megaphone,
  Coins,
  ChevronRight
} from 'lucide-react';
import { NightMarketEvent, Vendor, EventEntry } from '../../types';
import { 
  GeminiMessage, 
  getStoredGeminiApiKey, 
  getStoredGeminiModel, 
  buildNightMarketContext, 
  callGeminiApi, 
  generateMockGeminiResponse,
  checkServerAiStatus
} from '../../utils/gemini';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  event: NightMarketEvent;
  vendors: Vendor[];
  entries: EventEntry[];
}

/**
 * AI回答のMarkdown記法（見出し、太字、箇条書き、引用ボックスなど）を
 * 夜市テーマの洗練されたHTML要素に変換してレンダリングするコンポーネント
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inQuote = false;
  let quoteBuffer: string[] = [];

  const flushQuote = (key: string) => {
    if (quoteBuffer.length > 0) {
      elements.push(
        <div 
          key={key} 
          className="my-2.5 p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border-l-4 border-amber-400 text-amber-200 text-xs sm:text-sm leading-relaxed"
        >
          {quoteBuffer.map((qLine, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parseInlineMarkdown(qLine)}
            </p>
          ))}
        </div>
      );
      quoteBuffer = [];
      inQuote = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 引用ブロック (> ...)
    if (trimmed.startsWith('>')) {
      inQuote = true;
      quoteBuffer.push(trimmed.replace(/^>\s?/, ''));
      return;
    } else if (inQuote) {
      flushQuote(`quote-${index}`);
    }

    // 見出し (### または ##)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-sm sm:text-base font-black text-amber-300 mt-3 mb-1.5 flex items-center gap-1.5">
          {parseInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-base sm:text-lg font-black text-white mt-3.5 mb-2 pb-1 border-b border-slate-700/60 flex items-center gap-2">
          {parseInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      return;
    }

    // 区切り線
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        <hr key={`hr-${index}`} className="my-3 border-slate-700/80" />
      );
      return;
    }

    // 箇条書き (- または *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${index}`} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 pl-1 my-1 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
          <span>{parseInlineMarkdown(trimmed.substring(2))}</span>
        </div>
      );
      return;
    }

    // 番号付きリスト (1. 2. 3. など)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${index}`} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 pl-0.5 my-1 leading-relaxed">
          <span className="text-[11px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="flex-1">{parseInlineMarkdown(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // 空行
    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-1.5" />);
      return;
    }

    // 通常のテキスト行
    elements.push(
      <p key={`p-${index}`} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    );
  });

  if (inQuote) {
    flushQuote('quote-final');
  }

  return <div className="space-y-1">{elements}</div>;
}

/**
 * **太字** や `コード` をパースするヘルパー
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // **太字** の検索
    const boldMatch = remaining.match(/^(.*?)(\*\*(.*?)\*\*)/);
    // `コード` の検索
    const codeMatch = remaining.match(/^(.*?)(`([^`]+)`)/);

    let earliestMatch: { type: 'bold' | 'code'; before: string; matchText: string; inner: string } | null = null;

    if (boldMatch && (!codeMatch || boldMatch[1].length <= codeMatch[1].length)) {
      earliestMatch = {
        type: 'bold',
        before: boldMatch[1],
        matchText: boldMatch[2],
        inner: boldMatch[3]
      };
    } else if (codeMatch) {
      earliestMatch = {
        type: 'code',
        before: codeMatch[1],
        matchText: codeMatch[2],
        inner: codeMatch[3]
      };
    }

    if (!earliestMatch) {
      parts.push(remaining);
      break;
    }

    if (earliestMatch.before) {
      parts.push(earliestMatch.before);
    }

    if (earliestMatch.type === 'bold') {
      parts.push(
        <strong key={`b-${keyIndex++}`} className="font-bold text-white tracking-wide">
          {earliestMatch.inner}
        </strong>
      );
    } else {
      parts.push(
        <code key={`c-${keyIndex++}`} className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-slate-900 text-amber-300 border border-slate-700">
          {earliestMatch.inner}
        </code>
      );
    }

    remaining = remaining.substring(earliestMatch.before.length + earliestMatch.matchText.length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  event,
  vendors,
  entries
}) => {
  const [messages, setMessages] = useState<GeminiMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `こんにちは！夜市専属AIアシスタントの **Gemini** です🏮✨\n\n現在開いている「**${event.name}**」の最新データ（出店者数、ブース配置、火気器具、出店料の入金状況など）を把握しています。\n\n下のクイックボタンをタップするか、自由に質問や作成したい文章を指示してください！`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKey = getStoredGeminiApiKey();
  const modelName = getStoredGeminiModel();
  const [hasServerKey, setHasServerKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkServerAiStatus().then(r => setHasServerKey(r.hasServerKey));
    }
  }, [isOpen]);

  const isDemoMode = !apiKey && !hasServerKey;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt.trim();
    if (!textToSend || isLoading) return;

    const userMessage: GeminiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isQuickAction: !!customPrompt
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      let aiReplyText = '';
      const systemContext = buildNightMarketContext(event, vendors, entries);

      if (apiKey) {
        aiReplyText = await callGeminiApi(textToSend, systemContext, apiKey, modelName);
      } else {
        // APIキー未設定時はデモモード（少し待たせて自然な応答を演出）
        await new Promise((r) => setTimeout(r, 600));
        aiReplyText = generateMockGeminiResponse(textToSend, event, vendors, entries);
      }

      const aiMessage: GeminiMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: GeminiMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ エラーが発生しました: ${err.message || '通信エラー'}\n\n※APIキーの設定やネットワーク接続をご確認ください。右上の設定ボタンからAPIキーの変更が可能です。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('チャットの会話履歴をクリアしますか？')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content: `会話履歴をリセットしました。「**${event.name}**」に関するご質問や文面作成など、お気軽にお申し付けください！`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const quickActions = [
    {
      id: 'summary',
      label: '状況サマリー',
      icon: LayoutGrid,
      prompt: `現在の「${event.name}」の出店登録状況、火気使用数、未払い件数、要注意店舗などのサマリーと、優先して対応すべき業務を分かりやすくレポートしてください。`,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40'
    },
    {
      id: 'unpaid',
      label: '出店料催促文',
      icon: Coins,
      prompt: `「${event.name}」の出店料が未払いの出店者へ送る、丁寧かつ分かりやすい催促・リマインド連絡文（LINEおよびメール用）を作成してください。`,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/40'
    },
    {
      id: 'fire',
      label: '消防安全指導',
      icon: Flame,
      prompt: `「${event.name}」の火気使用店舗に関する消防安全指導のチェックポイントや、消火器の確認、消防署届出で注意すべき点をまとめてください。`,
      color: 'from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/40'
    },
    {
      id: 'recruit',
      label: '出店募集告知',
      icon: Megaphone,
      prompt: `「${event.name}」の出店者を募集するための、魅力的で活気のあるInstagram告知文および公式LINE配信テキストを作成してください。`,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
      id: 'confirm',
      label: '出店確定通知',
      icon: FileText,
      prompt: `出店が確定した店舗へ送る「出店確定および当日の搬入出・注意事項のご案内」テンプレートを作成してください。`,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/40'
    },
    {
      id: 'advice',
      label: '配置ヒント',
      icon: HelpCircle,
      prompt: `現在の出店者ジャンルや火気使用状況を踏まえた、ブース配置の最適化や混雑対策、来場者が楽しめるレイアウトのヒントを提案してください。`,
      color: 'from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/40'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 sm:bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl w-full max-w-4xl h-[100dvh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 relative">
        
        {/* モーダルヘッダー（モバイルでも折り返さない最適レイアウト） */}
        <div className="px-3 py-2.5 sm:px-6 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  Gemini 夜市AI
                </h2>
                {isDemoMode ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                    デモ
                  </span>
                ) : hasServerKey ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                    裏側AI接続中
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                    接続中
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {event.name}（出店: {vendors.length}件）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClearHistory}
              title="会話履歴をクリア"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              title="Gemini API設定"
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">設定</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* クイックアクションバー（モバイルでもスクロール可能であることが分かる視認性の高いUI） */}
        <div className="relative shrink-0 bg-slate-900/60 border-b border-slate-800/80">
          <div className="px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap shrink-0 pr-1">
              指示:
            </span>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border bg-gradient-to-r hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 shrink-0 ${action.color}`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
          {/* 右端のスクロール示唆グラデーション */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-950/80 to-transparent pointer-events-none flex items-center justify-end pr-1 sm:hidden">
            <ChevronRight className="w-3 h-3 text-slate-500 opacity-60" />
          </div>
        </div>

        {/* チャットメッセージ領域 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {isDemoMode && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] sm:text-xs leading-relaxed">
                <p className="font-bold">現在は「デモモード」で動作しています</p>
                <p className="text-amber-200/80">
                  右上の「設定」からGoogle AI Studioの無料キーを登録すると、自由な質問に最新のGeminiがリアルタイムで直接回答します。
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isAi = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 ${isAi ? 'justify-start' : 'justify-end'} group`}
              >
                {isAi && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-slate-950 rounded-[7px] sm:rounded-[10px] flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed relative shadow-md ${
                    isAi
                      ? 'bg-slate-900 text-slate-100 border border-slate-800'
                      : 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-medium'
                  }`}
                >
                  {/* ヘッダー（名前・時刻・コピーボタン） */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-current/10 text-[10px] sm:text-[11px] opacity-80">
                    <span className="font-bold flex items-center gap-1">
                      {isAi ? 'Gemini AI' : 'あなた'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{msg.timestamp}</span>
                      {isAi && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="hover:opacity-100 transition p-1 rounded hover:bg-slate-800"
                          title="回答をクリップボードにコピー"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 本文（Markdownフォーマット対応レンダリング） */}
                  <div className="select-text">
                    {isAi ? (
                      <FormattedMessage content={msg.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>

                {!isAi && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-700 p-0.5 shrink-0 flex items-center justify-center text-slate-300">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* ローディングスピナー */}
          {isLoading && (
            <div className="flex gap-2.5 justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-amber-500 p-0.5 shrink-0 animate-pulse">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Geminiが回答を作成中...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 入力フッター（スマホキーボードでも押しやすいレイアウト） */}
        <div className="p-2.5 sm:p-3.5 border-t border-slate-800 bg-slate-950 sm:bg-slate-900/95 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Geminiに夜市運営を相談・指示..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 sm:bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl sm:rounded-2xl px-3 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-500 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>送信</span>
            </button>
          </form>
          <div className="mt-1.5 hidden sm:flex items-center justify-between text-[10px] text-slate-500 px-1">
            <span>Enterキーで送信 / 上部ボタンで定型指示を即時生成</span>
            <span>Google Gemini AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
