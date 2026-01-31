import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, LogOut, PlusCircle, Send, ArrowLeft, Search, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LanguageSelector from "@/components/LanguageSelector";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Messages({ user, onLogout }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { recipientId } = useParams();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    // If recipientId is in URL, open that conversation
    if (recipientId) {
      openConversation(recipientId);
    }
  }, [recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (userId, userName = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      
      // Find conversation or set new one
      const existingConv = conversations.find(c => c.user_id === userId);
      setActiveChat({
        user_id: userId,
        user_name: userName || existingConv?.user_name || "User"
      });
      
      // Update unread count
      setConversations(convs => 
        convs.map(c => c.user_id === userId ? { ...c, unread_count: 0 } : c)
      );
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/messages`,
        { recipient_id: activeChat.user_id, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages([...messages, response.data]);
      setNewMessage("");
      
      // Update conversations list
      fetchConversations();
      toast.success(t('toast.messageSent'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSendingMessage(false);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const startNewChat = (searchUser) => {
    openConversation(searchUser.id, searchUser.name);
    setSearchQuery("");
    setSearchResults([]);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateString);
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="glass-effect border-b border-white/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <Moon className="w-8 h-8 text-void" />
                <span className="text-2xl font-heading font-light text-void tracking-tight">DreamWise</span>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-dashboard"
                >
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dreams')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-dreams"
                >
                  {t('nav.myDreams')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/community-hub')}
                  className="font-body text-void hover:text-void/80"
                  data-testid="nav-community-hub"
                >
                  {t('nav.community')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/messages')}
                  className="font-body text-lucid hover:text-lucid/80 font-medium"
                  data-testid="nav-messages"
                >
                  {t('messages.title')}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button
                onClick={() => navigate('/journal')}
                className="bg-void text-white hover:bg-void/90 rounded-full font-body font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="new-dream-button"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('nav.newDream')}
              </Button>
              <Button
                variant="ghost"
                onClick={onLogout}
                className="text-void hover:text-void/80"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-effect rounded-3xl overflow-hidden h-[calc(100vh-200px)] flex">
          {/* Sidebar - Conversations */}
          <div className={`w-full md:w-1/3 border-r border-white/30 flex flex-col ${activeChat ? 'hidden md:flex' : ''}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/30">
              <h2 className="text-xl font-heading font-light text-void mb-3">{t('messages.title')}</h2>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-void/40" />
                <Input
                  type="text"
                  placeholder={t('messages.searchPlaceholder')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-10 pl-10"
                  data-testid="search-users-input"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-white rounded-xl shadow-lg max-h-48 overflow-y-auto" data-testid="search-results">
                  <p className="text-xs text-void/60 font-body px-3 pt-2">{t('messages.searchResults')}</p>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => startNewChat(result)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-ethereal/20 transition-colors"
                      data-testid={`search-result-${result.id}`}
                    >
                      <div className="w-8 h-8 bg-ethereal/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-void" />
                      </div>
                      <span className="font-body text-void">{result.name}</span>
                      {result.is_premium && (
                        <span className="text-xs px-1.5 py-0.5 bg-lucid/20 text-void rounded-full">✨</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-void/60 font-body">{t('common.loading')}</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-void/30 mx-auto mb-3" />
                  <p className="text-void/60 font-body">{t('messages.noConversations')}</p>
                  <p className="text-sm text-void/40 font-body mt-1">{t('messages.startChat')}</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.user_id}
                    onClick={() => openConversation(conv.user_id, conv.user_name)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/30 transition-colors border-b border-white/20 ${
                      activeChat?.user_id === conv.user_id ? 'bg-white/30' : ''
                    }`}
                    data-testid={`conversation-${conv.user_id}`}
                  >
                    <div className="w-10 h-10 bg-ethereal/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-void" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-body font-medium text-void">{conv.user_name}</span>
                        <span className="text-xs text-void/50 font-body">
                          {conv.last_message_time && formatDate(conv.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-void/60 font-body truncate">{conv.last_message}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="w-5 h-5 bg-lucid rounded-full flex items-center justify-center">
                        <span className="text-xs font-body font-medium text-void">{conv.unread_count}</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : ''}`}>
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/30 flex items-center gap-3">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="md:hidden text-void hover:text-void/80"
                    data-testid="back-button"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-ethereal/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-void" />
                  </div>
                  <span className="font-body font-medium text-void">{activeChat.user_name}</span>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-void/50 font-body py-8">
                      {t('messages.noMessages')}
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            msg.sender_id === user.id
                              ? 'bg-void text-white rounded-br-md'
                              : 'bg-white/50 text-void rounded-bl-md'
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <p className="font-body text-sm">{msg.content}</p>
                          <span className={`text-xs mt-1 block ${
                            msg.sender_id === user.id ? 'text-white/60' : 'text-void/50'
                          }`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-white/30">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t('messages.typePlaceholder')}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-white/50 border-transparent focus:border-ethereal focus:ring-2 focus:ring-ethereal/50 rounded-xl h-10"
                      data-testid="message-input"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-void text-white hover:bg-void/90 rounded-xl px-4"
                      data-testid="send-message-button"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-void/20 mx-auto mb-4" />
                  <p className="text-void/60 font-body">{t('messages.subtitle')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
