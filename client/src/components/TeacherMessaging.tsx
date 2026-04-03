import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export default function TeacherMessaging() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");

  const { data: messages, isLoading, refetch } = trpc.teacher.getMessages.useQuery();
  
  const sendMessageMutation = trpc.teacher.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Message sent!");
      setMessageText("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) {
      toast.error("Please select a recipient and enter a message");
      return;
    }

    await sendMessageMutation.mutateAsync({
      recipientId: selectedConversation,
      content: messageText,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Conversations List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {messages && messages.length > 0 ? (
              <div className="space-y-2">
                {messages.map((msg: any) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedConversation(msg.recipientId)}
                    className={`w-full p-3 rounded-lg border transition-colors text-left ${
                      selectedConversation === msg.recipientId
                        ? "bg-primary/10 border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <p className="text-sm font-medium line-clamp-1">{msg.subject || "No subject"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {msg.content}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Compose Area */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedConversation ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
                  <input
                    type="text"
                    placeholder="Message subject..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="min-h-32"
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to send a message</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
