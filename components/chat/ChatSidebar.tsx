"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Hash, Plus, Search, ChevronDown, ChevronLeft, MessageSquare, Users } from "lucide-react";
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
  teamMembers: Profile[];
  currentUserId: string;
}

export function ChatSidebar({ channels, dms, teamMembers, currentUserId }: Props) {
  const params = useParams();
  const router = useRouter();
  const activeId = params?.id as string;
  
  const [search, setSearch] = useState("");
  const [showChannels, setShowChannels] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [members, setMembers] = useState(teamMembers);

  // Subscribe to profile changes for live presence
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

  const filteredChannels = channels.filter((c) => 
    !search || (c.name?.toLowerCase().includes(search.toLowerCase()))
  );
  
  const filteredMembers = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function startDM(memberId: string) {
    const dmId = await getOrCreateDM(currentUserId, memberId);
    if (dmId) {
      router.push(`/chat/${dmId}`);
    } else {
      toast.error("مقدرش يفتح المحادثة");
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 border-s border-border bg-sidebar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">الشات</h2>
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
        <div className="relative">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="دور على حاجة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-10 h-9 text-sm"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4">
        {/* Channels */}
        <div>
          <button
            onClick={() => setShowChannels(!showChannels)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
          >
            {showChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            <span>القنوات ({channels.length})</span>
          </button>
          {showChannels && (
            <div className="mt-1 space-y-0.5">
              {filteredChannels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/chat/${channel.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors group",
                    activeId === channel.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  )}
                >
                  <Hash className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))}
              {filteredChannels.length === 0 && (
                <div className="px-2.5 py-1 text-xs text-muted-foreground">مفيش قنوات</div>
              )}
            </div>
          )}
        </div>

        {/* DMs */}
        {dms.length > 0 && (
          <div>
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
            >
              {showDMs ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              <span>رسايل خاصة ({dms.length})</span>
            </button>
            {showDMs && (
              <div className="mt-1 space-y-0.5">
                {dms.map((dm) => (
                  <DmItem key={dm.id} dmId={dm.id} activeId={activeId} currentUserId={currentUserId} members={members} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Members - click to start DM */}
        <div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
          >
            {showMembers ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            <span>التيم ({members.length})</span>
          </button>
          {showMembers && (
            <div className="mt-1 space-y-0.5">
              {filteredMembers.map((member) => {
                const status = getUserStatus(member.last_seen_at);
                return (
                  <button
                    key={member.id}
                    onClick={() => startDM(member.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm w-full text-right hover:bg-accent transition-colors group"
                  >
                    <UserAvatar name={member.full_name} src={member.avatar_url} size="sm" status={status} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{member.full_name}</div>
                      {member.status_message && (
                        <div className="text-xs text-muted-foreground truncate">{member.status_message}</div>
                      )}
                    </div>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">مفيش حد تاني</div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function DmItem({ dmId, activeId, currentUserId, members }: {
  dmId: string;
  activeId: string;
  currentUserId: string;
  members: Profile[];
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

  return (
    <Link
      href={`/chat/${dmId}`}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        activeId === dmId ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      )}
    >
      <UserAvatar name={partner.full_name} src={partner.avatar_url} size="sm" status={status} />
      <span className="truncate">{partner.full_name}</span>
    </Link>
  );
}

function NewChannelDialog({ 
  open, 
  onOpenChange, 
  currentUserId,
  onCreated 
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
        <Button variant="ghost" size="icon-sm" title="قناة جديدة">
          <Plus className="h-4 w-4" />
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
          <Button variant="gradient" onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "بيعمل..." : "اعمل القناة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
