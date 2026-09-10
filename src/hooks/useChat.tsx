import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { chatService } from "../services";
import type { Conversation, Message } from "../types";

interface ChatContextValue {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  loading: boolean;
  refreshConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<Message[]>;
  send: (
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string
  ) => Promise<void>;
  startThread: (
    buyerId: string,
    buyerCompany: string,
    supplierId: string,
    supplierName: string,
    subject: string
  ) => Promise<Conversation>;
  totalUnread: number;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});
  const [loading, setLoading] = useState(false);

  const refreshConversations = useCallback(async () => {
    setLoading(true);
    try {
      setConversations(await chatService.listConversations());
    } finally {
      setLoading(false);
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    const messages = await chatService.listMessages(id);
    setMessagesByConversation((prev) => ({ ...prev, [id]: messages }));
    await chatService.markBuyerRead(id);
    setConversations(await chatService.listConversations());
    return messages;
  }, []);

  const send = useCallback(
    async (
      conversationId: string,
      senderId: string,
      senderName: string,
      text: string
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await chatService.sendMessage(conversationId, senderId, senderName, trimmed);
      const conv = (await chatService.listConversations()).find((c) => c.id === conversationId);
      // Demo acknowledgement only when the buyer wrote (supplier UI sends as supplier).
      if (conv && senderId === conv.buyerId) {
        setTimeout(async () => {
          await chatService.demoSupplierReply(conversationId);
          setConversations(await chatService.listConversations());
          const fresh = await chatService.listMessages(conversationId);
          setMessagesByConversation((prev) => ({ ...prev, [conversationId]: fresh }));
        }, 1500);
      }
      const fresh = await chatService.listMessages(conversationId);
      setMessagesByConversation((prev) => ({ ...prev, [conversationId]: fresh }));
      setConversations(await chatService.listConversations());
    },
    []
  );

  const startThread = useCallback(
    async (
      buyerId: string,
      buyerCompany: string,
      supplierId: string,
      supplierName: string,
      subject: string
    ) => {
      const conv = await chatService.getOrCreateConversation(
        buyerId,
        buyerCompany,
        supplierId,
        supplierName,
        subject
      );
      setConversations(await chatService.listConversations());
      return conv;
    },
    []
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      messagesByConversation,
      loading,
      refreshConversations,
      openConversation,
      send,
      startThread,
      totalUnread: conversations.reduce((n, c) => n + c.unreadBuyer, 0),
    }),
    [
      conversations,
      messagesByConversation,
      loading,
      refreshConversations,
      openConversation,
      send,
      startThread,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
