import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Send, User, Bot, Trophy, Activity, AlertCircle, FileJson, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- Types ---
type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

const SYSTEM_INSTRUCTION = `أنت الآن "FPL Behavior Expert" (خبير سلوك مدربي الفانتزي). مهمتك هي تحليل البيانات التاريخية الكاملة لمدرب معين في لعبة Fantasy Premier League.

سوف يتم تزويدك ببيانات بصيغة JSON تحتوي على:
1. تاريخ التبديلات الكامل (All Season Transfers).
2. تشكيلة الجولة الأخيرة ونقاطها (Latest Squad & Points).
3. الترتيب العام (Overall Rank) وتفاصيل النقاط لكل جولة.

المطلوب منك في أول رسالة تحليل "النمط السلوكي" (Behavioral Pattern) للمدرب بناءً على الآتي:
1. النمط التكتيكي: هل هو مدرب "صبار" (Patient) يحتفظ باللاعبين؟ أم "مقامر" (Gambler) يأخذ نقاط خصم (-4) كثيراً؟
2. نوع القرارات: هل يلحق الـ (Trend) واللاعبين الأكثر شراءً (عاطفي/عشوائي)؟ أم يختار لاعبين غير معروفين قبل انفجارهم (تكتيكي/مستقبلي)؟
3. التغير في النمط: هل بدأ الموسم بهدوء ثم تحول للعشوائية؟ متى حدثت نقطة التحول؟
4. عرض التشكيلة والترتيب: لخص أداء الجولة الأخيرة والترتيب العام بشكل جذاب.

يجب أن تتصرف كـ Chatbot ذكي؛ بعد التحليل، انتظر أسئلة المستخدم وأجب عليها بناءً على "تاريخه" المسجل عندك فقط. كن صريحاً، ناقداً، وداعماً بلمسة احترافية.
اللغة المطلوبة: العربية.`;

const SAMPLE_JSON = `{
  "manager_name": "Ahmed FPL",
  "overall_rank": 1250432,
  "total_points": 1450,
  "latest_squad": {
    "gw": 25,
    "points": 45,
    "average": 52,
    "players": [
      {"name": "Areola", "points": 2},
      {"name": "Gabriel", "points": 6},
      {"name": "Saliba", "points": 6},
      {"name": "Porro", "points": 1},
      {"name": "Saka", "points": 12, "is_captain": true},
      {"name": "Foden", "points": 2},
      {"name": "Palmer", "points": 8},
      {"name": "Gordon", "points": 5},
      {"name": "Haaland", "points": 2},
      {"name": "Watkins", "points": 1},
      {"name": "Solanke", "points": 0}
    ]
  },
  "transfers": [
    {"gw": 2, "in": "Mbeumo", "out": "Rashford", "cost": 0},
    {"gw": 3, "in": "Alvarez", "out": "Jackson", "cost": 0},
    {"gw": 4, "in": "Son", "out": "Mitoma", "cost": -4},
    {"gw": 8, "in": "Watkins", "out": "Alvarez", "cost": 0},
    {"gw": 12, "in": "Palmer", "out": "Diaby", "cost": -4},
    {"gw": 15, "in": "Gordon", "out": "Mbeumo", "cost": 0},
    {"gw": 19, "in": "Solanke", "out": "Haaland", "cost": -4},
    {"gw": 22, "in": "De Bruyne", "out": "Son", "cost": -8},
    {"gw": 24, "in": "Haaland", "out": "Watkins", "cost": -4}
  ],
  "chips_used": [
    {"name": "Wildcard", "gw": 9}
  ]
}`;

export default function App() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartAnalysis = async () => {
    if (!jsonInput.trim()) return;
    
    setIsLoading(true);
    setIsDataLoaded(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyB9NamauQ8_DX7GHSagY9zojOTFxwgwGh4" });
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });
      setChatSession(chat);
      
      const prompt = `إليك بياناتي في لعبة الفانتزي بصيغة JSON:\n\n${jsonInput}\n\nيرجى تقديم التحليل الأولي بناءً على التعليمات.`;
      
      setMessages([{ id: Date.now().toString(), role: 'user', text: 'تم رفع بيانات الفانتزي بنجاح. أرجو تحليلها.' }]);
      
      const response = await chat.sendMessage({ message: prompt });
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error('Error starting analysis:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'عذراً، حدث خطأ أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading || !chatSession) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await chatSession.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-emerald-400">
                FPL Behavior Expert
              </h1>
              <p className="text-xs text-zinc-400">خبير تحليل سلوك مدربي الفانتزي</p>
            </div>
          </div>
          {isDataLoaded && (
            <button 
              onClick={() => {
                setIsDataLoaded(false);
                setMessages([]);
                setChatSession(null);
              }}
              className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              تحليل مدرب جديد
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        {!isDataLoaded ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                  <FileJson className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">أدخل بيانات الفانتزي (JSON)</h2>
                <p className="text-zinc-400 text-sm">
                  قم بلصق بيانات فريقك بصيغة JSON ليقوم الخبير بتحليل نمطك التكتيكي وقراراتك.
                </p>
              </div>
              
              <div className="mb-6">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                  placeholder="الصق الـ JSON هنا..."
                  dir="ltr"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleStartAnalysis}
                  disabled={!jsonInput.trim() || isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      بدء التحليل
                    </>
                  )}
                </button>
                <button
                  onClick={() => setJsonInput(SAMPLE_JSON)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors border border-zinc-700"
                >
                  بيانات تجريبية
                </button>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-xl text-center">
                <Activity className="w-6 h-6 text-purple-400 mx-auto mb-3" />
                <h3 className="font-medium text-zinc-200 mb-1">النمط التكتيكي</h3>
                <p className="text-xs text-zinc-500">هل أنت صبور أم مقامر؟</p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-xl text-center">
                <AlertCircle className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-medium text-zinc-200 mb-1">نوع القرارات</h3>
                <p className="text-xs text-zinc-500">عاطفية أم مبنية على بيانات؟</p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-xl text-center">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-3" />
                <h3 className="font-medium text-zinc-200 mb-1">تقييم التشكيلة</h3>
                <p className="text-xs text-zinc-500">تحليل أداء الجولة الأخيرة</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-[calc(100vh-5rem)]">
            <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 border border-zinc-700' 
                      : 'bg-gradient-to-br from-purple-600 to-emerald-500 shadow-lg shadow-purple-500/20'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-zinc-300" /> : <Bot className="w-6 h-6 text-white" />}
                  </div>
                  
                  <div className={`max-w-[85%] rounded-2xl p-5 ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-300 rounded-tr-sm border border-zinc-800 shadow-xl'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      <div className="markdown-body prose prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-zinc-900 rounded-2xl rounded-tr-sm p-5 border border-zinc-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="pt-4 pb-2 sticky bottom-0 bg-zinc-950">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all shadow-lg"
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اسأل الخبير عن تشكيلتك، تبديلاتك، أو نصيحة للجولة القادمة..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-0"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="w-10 h-10 mb-0.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                </button>
              </form>
              <p className="text-center text-[10px] text-zinc-500 mt-2">
                قد يخطئ الخبير أحياناً. تأكد من قراراتك قبل تأكيد التبديلات (-4).
              </p>
            </div>
          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3f3f46;
          border-radius: 20px;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          color: #e4e4e7;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .markdown-body h3 {
          color: #a78bfa;
        }
        .markdown-body p {
          margin-bottom: 1em;
        }
        .markdown-body ul {
          list-style-type: disc;
          padding-inline-start: 1.5em;
          margin-bottom: 1em;
        }
        .markdown-body li {
          margin-bottom: 0.25em;
        }
        .markdown-body strong {
          color: #34d399;
        }
      `}} />
    </div>
  );
}
