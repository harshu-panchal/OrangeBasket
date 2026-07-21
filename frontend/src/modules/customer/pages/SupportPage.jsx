import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Mail, ChevronDown, ChevronUp, FileText, ChevronLeft, PlusCircle, X, Send } from 'lucide-react';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { customerApi } from '../services/customerApi';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import axiosInstance from '@core/api/axios';
import { getJSON, setJSON, STORAGE_KEYS } from '@core/utils/storage';

const FAQ_CACHE_KEY = STORAGE_KEYS.FAQ_CACHE;
const FAQ_CACHE_TTL_MS = 5 * 60 * 1000;

const SupportPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const supportEmail = settings?.supportEmail || '';
    const supportEmailShort = supportEmail ? (supportEmail.length > 12 ? supportEmail.slice(0, 12) + '...' : supportEmail) : 'support@...';
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [ticketData, setTicketData] = useState({
        subject: '',
        description: '',
        priority: 'medium'
    });
    const [faqs, setFaqs] = useState([]);

    useEffect(() => {
        const fetchFaqs = async () => {
            const cached = getJSON(FAQ_CACHE_KEY, null, { storage: 'session' });
            if (cached && Array.isArray(cached.items)) {
                setFaqs(cached.items);
                return;
            }

            try {
                const response = await axiosInstance.get('/public/faqs', {
                    params: { category: 'Customer', status: 'published' }
                });
                const data = response.data?.result ?? response.data;
                const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : [];
                setFaqs(list);
                setJSON(
                    FAQ_CACHE_KEY,
                    { items: list },
                    { storage: 'session', ttlMs: FAQ_CACHE_TTL_MS },
                );
            } catch (error) {
                console.error('Error fetching FAQs:', error);
            }
        };

        fetchFaqs();
    }, []);

    const handleTicketSubmit = async (e) => {
        e.preventDefault();
        try {
            setTicketLoading(true);
            const res = await customerApi.createTicket({
                ...ticketData,
                userType: 'Customer'
            });
            if (res.data.success) {
                showToast("Ticket raised successfully", "success");
                setIsTicketModalOpen(false);
                setTicketData({ subject: '', description: '', priority: 'medium' });
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to create ticket", "error");
        } finally {
            setTicketLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pb-24 font-['Outfit',_sans-serif]">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Help & Support</h1>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-5">
                {/* Contact Channels */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ContactCard emoji="💬" badgeBg="bg-emerald-50/80 border-emerald-100 text-emerald-700" label="Chat Us" sub="Instant Support" to="/chat" />
                    <ContactCard
                        emoji="🎫"
                        badgeBg="bg-amber-50/80 border-amber-100 text-amber-700"
                        label="Raise Ticket"
                        sub="Formal Request"
                        onClick={() => setIsTicketModalOpen(true)}
                    />
                    <ContactCard emoji="📞" badgeBg="bg-blue-50/80 border-blue-100 text-blue-700" label="Call Us" sub="+91 98765..." />
                    <ContactCard emoji="✉️" badgeBg="bg-purple-50/80 border-purple-100 text-purple-700" label="Email Us" sub={supportEmailShort} />
                </div>

                {/* FAQ Section */}
                <div>
                    <h2 className="text-base font-bold text-slate-800 mb-3 px-1">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        {faqs.length > 0 ? (
                            faqs.map((faq) => (
                                <FAQItem
                                    key={faq._id}
                                    question={faq.question}
                                    answer={faq.answer}
                                />
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 text-sm text-slate-400 text-center font-medium">
                                No FAQs available right now.
                            </div>
                        )}
                    </div>
                </div>

                {/* Legal Links */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Legal & Policy</h3>
                    <div className="space-y-3">
                        <Link to="/terms" className="flex items-center gap-3 text-slate-700 hover:text-slate-900 font-bold text-sm">
                            <div className="w-8 h-8 rounded-full bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                                <span className="text-xs">📜</span>
                            </div>
                            Terms & Conditions
                        </Link>
                        <Link to="/privacy" className="flex items-center gap-3 text-slate-700 hover:text-slate-900 font-bold text-sm">
                            <div className="w-8 h-8 rounded-full bg-purple-50/80 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                                <span className="text-xs">🛡️</span>
                            </div>
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Ticket Creation Modal */}
            <AnimatePresence>
                {isTicketModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                                        <span className="text-sm">🎫</span>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-slate-900">Raise Support Ticket</h3>
                                </div>
                                <button
                                    onClick={() => setIsTicketModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleTicketSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        value={ticketData.subject}
                                        onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                                        placeholder="Brief title of your issue"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                                    <select
                                        value={ticketData.priority}
                                        onChange={(e) => setTicketData({ ...ticketData, priority: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm text-slate-800"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={ticketData.description}
                                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                        placeholder="Please explain your issue in detail..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-medium text-sm text-slate-800 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTicketModalOpen(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={ticketLoading}
                                        className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-[#0a701a] transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                                    >
                                        {ticketLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={16} /> Submit Ticket
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ContactCard = ({ emoji, badgeBg, label, sub, to, onClick }) => {
    const CardContent = (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50/80 transition-colors cursor-pointer group h-full"
        >
            <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center shadow-2xs group-hover:scale-108 transition-transform", badgeBg)}>
                <span className="text-xl">{emoji}</span>
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm whitespace-nowrap">{label}</h3>
                <p className="text-[10px] text-slate-500 font-semibold">{sub}</p>
            </div>
        </div>
    );

    return to ? <Link to={to} className="block h-full">{CardContent}</Link> : CardContent;
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
                <span className="font-semibold text-slate-800 text-sm">{question}</span>
                {isOpen ? <ChevronUp size={18} className="text-slate-700" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="px-5 pb-4 text-sm text-slate-500 font-medium leading-relaxed bg-slate-50/50">
                    {answer}
                </div>
            )}
        </div>
    );
};

export default SupportPage;

