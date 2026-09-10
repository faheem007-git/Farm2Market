import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { chatService } from "../../services";
import type { Conversation, Message } from "../../types";
import { Badge, Button, Card, Loading, PageHeader } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { FarmerEmpty } from "../../components/domain/farmerFriendly";
import { cn } from "../../utils/cn";

/** Supplier inbox on the same shared chat store the buyer uses. */
export default function SupplierChatPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const mine = useMemo(
    () =>
      conversations.filter(
        (c) => user && (c.supplierId === user.id || c.supplierName === user.company)
      ),
    [conversations, user]
  );
  const selected = mine.find((c) => c.id === conversationId) ?? null;

  useEffect(() => {
    let cancelled = false;
    chatService.listConversations().then((all) => {
      if (!cancelled) {
        setConversations(all);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    chatService.listMessages(conversationId).then((m) => {
      if (!cancelled) setMessages(m);
    });
    void chatService.markSupplierRead(conversationId).then(() =>
      chatService.listConversations().then((all) => {
        if (!cancelled) setConversations(all);
      })
    );
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !conversationId || !draft.trim()) return;
    setSending(true);
    try {
      await chatService.sendMessage(conversationId, user.id, user.company, draft);
      setDraft("");
      setMessages(await chatService.listMessages(conversationId));
      setConversations(await chatService.listConversations());
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("chat.title")} subtitle={t("chat.subtitleBuyer")} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-2 md:col-span-1">
          {loading ? (
            <Loading label={t("chat.loading")} />
          ) : mine.length === 0 ? (
            <FarmerEmpty emoji="💬" title={t("chat.noConv")} body={t("chat.noConvBody")} />
          ) : (
            <ul className="divide-y divide-stone-100">
              {mine.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/supplier/chat/${c.id}`)}
                    className={cn(
                      "block w-full px-3 py-3 text-left hover:bg-brand-50",
                      c.id === conversationId && "bg-brand-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-900">{c.buyerCompany}</p>
                      {c.unreadSupplier > 0 && <Badge tone="green">{c.unreadSupplier} new</Badge>}
                    </div>
                    <p className="truncate text-xs text-stone-500">{c.subject}</p>
                    <p className="truncate text-xs text-stone-500">{c.lastMessage || "—"}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex min-h-96 flex-col p-4 md:col-span-2">
          {!selected ? (
            <FarmerEmpty emoji="💬" title={t("chat.select")} body={t("chat.chooseThread")} />
          ) : (
            <>
              <div className="border-b border-stone-100 pb-2">
                <p className="font-semibold text-stone-900">{selected.buyerCompany}</p>
                <p className="text-xs text-stone-500">{selected.subject}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
                {messages.map((m) => {
                  const mineMsg = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mineMsg ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", mineMsg ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-800")}>
                        {!mineMsg && <p className="text-xs font-semibold opacity-70">{m.senderName}</p>}
                        <p>{m.text}</p>
                        <p className={cn("mt-0.5 text-[11px]", mineMsg ? "text-brand-100" : "text-stone-400")}>{m.sentAt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={onSend} className="flex gap-2 border-t border-stone-100 pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`${t("chat.typeMessage")} ${selected.buyerCompany}…`}
                  aria-label={t("chat.typeMessage")}
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                />
                <Button type="submit" loading={sending} disabled={!draft.trim()}>
                  <Send size={16} /> {t("common.send")}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
