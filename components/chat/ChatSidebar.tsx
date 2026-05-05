"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Hash,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { cn, getUserStatus } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateDM } from "@/lib/chat-helpers";
import { toast } from "sonner";
import type { Conversation, Profile } from "@/lib/database.types";

interface Props {
  channels: Conversation[];
  dms: Conversation[];
  taskChats: Conversation[];
  teamMembers: Profile[];
  currentUserId: string;
  unreadByConv: Record<string, number>;
}

export function ChatSidebar({
  channels,
  dms,
  taskChats,
  teamMembers,
  currentUserId,
  unreadByConv,
}: Props) {
  const params = useParams();
  const router = useRouter();
  const activeId = params?.id as string;

  const [search, setSearch] = useState("");
  const [showChannels, setShowChannels] = useState(true);
  const [showTaskChats, setShowTaskChats] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [members, setMembers] = useState(teamMembers);
  const [unread, setUnread] = useState<Record<string, number>>(unreadByConv);

  // Sync prop changes (e.g. fresh layout fetch)
  useEffect(() => { setUnread(unreadByConv); }, [unreadByConv]);

  // Realtime: profile updates (presence)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("profiles-presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        setMembers((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: new messages → bump unread for non-active conversations
  useEffect(() => {
    const supabase = createClient();
    // Build a set of conv ids the user is in (avoid bumping for unrelated convs)
    const myConvIds = new Set<string>([
      ...channels.map((c) => c.id),
      ...dms.map((c) => c.id),
      ...taskChats.map((c) => c.id),
    ]);
    const channel = supabase
      .channel("sidebar-message-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { conversation_id: string; author_id: string };
          if (msg.author_id === currentUserId) return; // own message
          if (!myConvIds.has(msg.conversation_id)) return;
          if (msg.conversation_id === activeId) return; // currently viewing
          setUnread((prev) => ({
            ...prev,
            [msg.conversation_id]: (prev[msg.conversation_id] ?? 0) + 1,
          }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channels, dms, taskChats, currentUserId, activeId]);

  // When user opens a conversation, mark it read
  useEffect(() => {
    if (!activeId) return;
    const supabase = createClient();
    supabase
      .rpc("mark_conversation_read", { p_user: currentUserId, p_conversation: activeId })
      .then(() => {
        setUnread((prev) => {
          if (!prev[activeId]) return prev;
          const next = { ...prev };
          delete next[activeId];
          return next;
        });
      });
  }, [activeId, currentUserId]);

  const filteredChannels = channels.filter((c) =>
    !search || (c.name?.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredTaskChats = taskChats.filter((c) =>
    !search || (c.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMembers = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  async function startDM(memberId: string) {
    const dmId = await getOrCreateDM(currentUserId, memberId);
    if (dmId) {
      router.push(`/chat/${dmId}`);
    } else {
      toast.error("مقدرش يفتح المحادثة");
    }
  }

  return (
    <aside className="w-[260px] flex-shrink-0 border-s border-sidebar-border bg-sidebar flex flex-col">
      {/* Header */}
      <div className="px-4 h-[52px] border-b border-sidebar-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-sm">الشات</h2>
          {totalUnread > 0 && (
            <span className="text-[10px] tabular bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded-full">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
        <NewChannelDialog
          open={newChannelOpen}
          onOpenChange={setNewChannelOpen}
          currentUserId={currentUserId}
          onCreated={(id) => {
            setNewChannelOpen(false);
            router.push(`/chat/${id}`);
            router.refresh();
          }}
        />
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="دور..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pe-7"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4">
        {/* Channels */}
        <Section
          label="القنوات"
          count={channels.length}
          open={showChannels}
          onToggle={() => setShowChannels(!showChannels)}
        >
          {filteredChannels.map((channel) => (
            <ConvLink
              key={channel.id}
              href={`/chat/${channel.id}`}
              active={activeId === channel.id}
              unread={unread[channel.id] ?? 0}
              icon={<Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              label={channel.name ?? "(بدون اسم)"}
            />
          ))}
          {filteredChannels.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-muted-foreground/60">مفيش قنوات</div>
          )}
        </Section>

        {/* Task chats */}
        {taskChats.length > 0 && (
          <Section
            label="شات التاسكات"
            count={taskChats.length}
            open={showTaskChats}
            onToggle={() => setShowTaskChats(!showTaskChats)}
          >
            {filteredTaskChats.map((c) => (
              <ConvLink
                key={c.id}
                href={`/chat/${c.id}`}
                active={activeId === c.id}
                unread={unread[c.id] ?? 0}
                icon={<ListChecks className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                label={c.name ?? "تاسك"}
              />
            ))}
          </Section>
        )}

        {/* DMs */}
        {dms.length > 0 && (
          <Section
            label="رسايل خاصة"
            count={dms.length}
            open={showDMs}
            onToggle={() => setShowDMs(!showDMs)}
          >
            {dms.map((dm) => (
              <DmItem
                key={dm.id}
                dmId={dm.id}
                activeId={activeId}
                currentUserId={currentUserId}
                members={members}
                unread={unread[dm.id] ?? 0}
              />
            ))}
          </Section>
        )}

        {/* Team Members */}
        <Section
          label="التيم"
          count={members.length}
          open={showMembers}
          onToggle={() => setShowMembers(!showMembers)}
        >
          {filteredMembers.map((member) => {
            const status = getUserStatus(member.last_seen_at);
            return (
              <button
                key={member.id}
                onClick={() => startDM(member.id)}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm w-full text-right hover:bg-elevated/60 transition-colors"
              >
                <UserAvatar name={member.full_name} src={member.avatar_url} size="xs" status={status} />
                <span className="flex-1 truncate text-xs text-muted-foreground group-hover:text-foreground">
                  {member.full_name}
                </span>
                <MessageSquare className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-muted-foreground/60">مفيش حد تاني</div>
          )}
        </Section>
      </div>
    </aside>
  );
}

function ConvLink({
  href,
  active,
  unread,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  unread: number;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-elevated text-foreground"
          : unread > 0
            ? "text-foreground font-semibold hover:bg-elevated/60"
            : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
      )}
    >
      {icon}
      <span className="truncate flex-1">{label}</span>
      {unread > 0 && !active && (
        <span className="text-[10px] tabular font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function Section({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full px-2 py-1 section-label hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronLeft className="h-2.5 w-2.5" />}
        <span className="flex-1 text-right">{label}</span>
        <span className="text-[10px] tabular opacity-60">{count}</span>
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function DmItem({ dmId, activeId, currentUserId, members, unread }: {
  dmId: string;
  activeId: string;
  currentUserId: string;
  members: Profile[];
  unread: number;
}) {
  const [partner, setPartner] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", dmId);
      const memberIds = (data ?? []) as Array<{ user_id: string }>;
      const partnerId = memberIds.find((m) => m.user_id !== currentUserId)?.user_id;
      if (partnerId) {
        const found = members.find((m) => m.id === partnerId);
        if (found) setPartner(found);
      }
    })();
  }, [dmId, currentUserId, members]);

  if (!partner) return null;
  const status = getUserStatus(partner.last_seen_at);
  const active = activeId === dmId;

  return (
    <Link
      href={`/chat/${dmId}`}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-elevated text-foreground"
          : unread > 0
            ? "text-foreground font-semibold hover:bg-elevated/60"
            : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
      )}
    >
      <UserAvatar name={partner.full_name} src={partner.avatar_url} size="xs" status={status} />
      <span className="flex-1 truncate text-xs">{partner.full_name}</span>
      {unread > 0 && !active && (
        <span className="text-[10px] tabular font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function NewChannelDialog({
  open,
  onOpenChange,
  currentUserId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return toast.error("اكتب اسم للقناة الأول");
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        type: "channel",
        name: name.trim(),
        description: description.trim() || null,
        icon: "hash",
        created_by: currentUserId,
      } as Record<string, unknown>)
      .select()
      .single();
    if (!error && data) {
      // Add creator as member
      await supabase
        .from("conversation_members")
        .insert({
          conversation_id: (data as Conversation).id,
          user_id: currentUserId,
          is_admin: true,
        } as Record<string, unknown>);
    }
    setCreating(false);
    if (error || !data) {
      return toast.error("مقدرش يعمل القناة");
    }
    toast.success("اتعملت");
    setName("");
    setDescription("");
    onCreated((data as Conversation).id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="قناة جديدة" className="h-7 w-7">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>قناة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم القناة</label>
            <Input
              placeholder="مشاريع، تصميم، تطوير..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">الوصف (لو حابب)</label>
            <Input
              placeholder="القناة دي بتاعت إيه؟"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "بيعمل..." : "اعمل القناة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
