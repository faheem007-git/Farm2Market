import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { Badge, Button, Card, EmptyState, Loading, PageHeader } from "../../components/common/ui";
import { cn } from "../../utils/cn";

export default function ChatPage() {
  const { user } = useAuth();
  const {
    conversations,
    messagesByConversation,
    loading,
    refreshConversations,
    openConversation,
    send,
  } = useChat();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (conversationId) void openConversation(conversationId);
  }, [conversationId, openConversation]);

  const selected = conversations.find((c) => c.id === conversationId) ?? null;
  const messages = conversationId ? (messagesByConversation[conversationId] ?? []) : [];
  // Buyer inbox shows only this buyer's threads.
  const mine = useMemo(
    () => conversations.filter((c) => !user || c.buyerId === user.id),
    [conversations, user]
  );

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !conversationId || !draft.trim()) return;
    setSending(true);
    try {
      await send(conversationId, user.id, user.company, draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="Direct line to your FPO partners." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-2 md:col-span-1">
          {loading && mine.length === 0 ? (
            <Loading label="Loading conversations…" />
          ) : mine.length === 0 ? (
            <EmptyState title="No conversations" body="Open a supplier page and start a chat." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {mine.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/buyer/chat/${c.id}`)}
                    className={cn(
                      "block w-full px-3 py-3 text-left hover:bg-brand-50",
                      c.id === conversationId && "bg-brand-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-900">{c.supplierName}</p>
                      {c.unreadBuyer > 0 && <Badge tone="green">{c.unreadBuyer} new</Badge>}
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
            <EmptyState title="Select a conversation" body="Choose a supplier thread to read and reply." />
          ) : (
            <>
              <div className="border-b border-stone-100 pb-2">
                <p className="font-semibold text-stone-900">{selected.supplierName}</p>
                <p className="text-xs text-stone-500">{selected.subject}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
                {messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          mine ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-800"
                        )}
                      >
                        {!mine && <p className="text-xs font-semibold opacity-70">{m.senderName}</p>}
                        <p>{m.text}</p>
                        <p className={cn("mt-0.5 text-[11px]", mine ? "text-brand-100" : "text-stone-400")}>{m.sentAt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={onSend} className="flex gap-2 border-t border-stone-100 pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selected.supplierName}…`}
                  aria-label="Message text"
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                />
                <Button type="submit" loading={sending} disabled={!draft.trim()}>
                  <Send size={16} /> Send
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
