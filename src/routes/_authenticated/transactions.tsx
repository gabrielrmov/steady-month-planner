import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Repeat2, CreditCard, Pencil, Inbox, Search, X } from "lucide-react";

const tabSchema = z.object({
  tab: z.enum(["recurring", "sporadic", "cards", "income", "received"]).optional(),
});

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Contas e lançamentos | Finlist" },
      { name: "description", content: "Gerencie contas recorrentes, esporádicas, cartões e recebimentos em um só lugar." },
      { property: "og:title", content: "Contas e lançamentos | Finlist" },
      { property: "og:description", content: "Gerencie contas recorrentes, esporádicas, cartões e recebimentos em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransactionsPage,
  validateSearch: tabSchema,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tx = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  type: string;
  is_recurring: boolean;
  payment_method: string;
  card_id: string | null;
  category_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  purchase_group_id: string | null;
  categories?: { name: string; color: string } | null;
  cards?: { name: string; color: string } | null;
};

function TransactionsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [query, setQuery] = useState("");
  const from = format(month, "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  const qc = useQueryClient();

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["tx", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name, color), cards(name, color)")
        .gte("due_date", from)
        .lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as Tx[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["tx"] });
    qc.invalidateQueries({ queryKey: ["installments"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removido");
    },
  });

  const delGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("transactions").delete().eq("purchase_group_id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removido de todos os meses");
    },
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: paid ? "paid" : "pending", paid_at: paid ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tx"] }),
  });

  const q = query.trim().toLowerCase();
  const searchedTxs = q
    ? txs.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.categories?.name.toLowerCase().includes(q) ||
          t.cards?.name.toLowerCase().includes(q),
      )
    : txs;

  const pixExpenses = searchedTxs.filter((t) => t.type === "expense" && t.payment_method !== "card");
  const recurring = pixExpenses.filter((t) => t.is_recurring);
  const sporadic = pixExpenses.filter((t) => !t.is_recurring);
  const cardExpenses = searchedTxs.filter((t) => t.type === "expense" && t.payment_method === "card");
  const incomes = searchedTxs.filter((t) => t.type === "income");
  const received = incomes.filter((t) => t.status === "paid");

  const cardsGrouped = new Map<string, { name: string; color: string; items: Tx[] }>();
  for (const t of cardExpenses) {
    const key = t.card_id ?? "none";
    if (!cardsGrouped.has(key)) {
      cardsGrouped.set(key, {
        name: t.cards?.name ?? "Sem cartão",
        color: t.cards?.color ?? "#6B7280",
        items: [],
      });
    }
    cardsGrouped.get(key)!.items.push(t);
  }

  const handleEdit = (t: Tx) => {
    setEditing(t);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="animate-rise space-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="font-display truncate text-[28px] font-normal sm:text-[34px]">Contas</h1>
          <p className="text-sm text-muted-foreground">Gerencie contas a pagar e receber</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center justify-between gap-1 rounded-lg border border-border bg-card p-1 sm:flex-none sm:justify-start">
            <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-0 flex-1 truncate text-center text-sm font-medium capitalize sm:min-w-32 sm:flex-none">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)} className="hover-glow shrink-0">
                <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nova</span>
              </Button>
            </DialogTrigger>
            <TransactionForm
              key={editing?.id ?? "new"}
              editing={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
                invalidateAll();
              }}
              defaultMonth={month}
            />
          </Dialog>
        </div>
      </div>

      <div className="animate-rise relative" style={{ animationDelay: "60ms" }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por descrição, categoria ou cartão..."
          className="pl-9 pr-9 transition-shadow focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Tabs
        value={search.tab ?? "recurring"}
        onValueChange={(v) => navigate({ search: { tab: v as any }, replace: true })}
        className="animate-rise"
        style={{ animationDelay: "120ms" }}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:flex-wrap">
            <TabsTrigger value="recurring">Recorrentes ({recurring.length})</TabsTrigger>
            <TabsTrigger value="sporadic">Esporádicos ({sporadic.length})</TabsTrigger>
            <TabsTrigger value="cards">Cartões ({cardExpenses.length})</TabsTrigger>
            <TabsTrigger value="income">A receber ({incomes.length - received.length})</TabsTrigger>
            <TabsTrigger value="received">Recebidos ({received.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recurring" className="mt-4">
          <TxList items={recurring} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="sporadic" className="mt-4">
          <TxList items={sporadic} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="cards" className="mt-4 space-y-4">
          {!isLoading && cardsGrouped.size === 0 && (
            <EmptyState message="Nenhuma compra no cartão neste mês." />
          )}
          {isLoading && <ListSkeleton rows={3} />}
          {[...cardsGrouped.entries()].map(([key, group], gi) => {
            const total = group.items.reduce((s, i) => s + Number(i.amount), 0);
            return (
              <div key={key} className="animate-rise space-y-2" style={{ animationDelay: `${gi * 70}ms` }}>
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-transform duration-200 hover:scale-110"
                    style={{ backgroundColor: group.color + "22", color: group.color }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold tracking-tight">{group.name}</h3>
                  <span className="ml-auto text-sm font-semibold">{brl(total)}</span>
                </div>
                <TxList items={group.items} loading={false} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} onEdit={handleEdit} showInstallment />
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <TxList items={incomes.filter((t) => t.status !== "paid")} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} onEdit={handleEdit} incomeMode />
        </TabsContent>
        <TabsContent value="received" className="mt-4">
          <TxList items={received} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} onEdit={handleEdit} incomeMode />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="animate-rise flex flex-col items-center gap-2 p-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

function TxList({
  items,
  loading,
  onToggle,
  onDelete,
  onDeleteGroup,
  onEdit,
  incomeMode,
  showInstallment,
}: {
  items: Tx[];
  loading: boolean;
  onToggle: (p: { id: string; paid: boolean }) => void;
  onDelete: (id: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onEdit: (t: Tx) => void;
  incomeMode?: boolean;
  showInstallment?: boolean;
}) {
  if (loading) return <ListSkeleton />;
  if (items.length === 0)
    return <EmptyState message="Nada por aqui neste mês." />;
  return (
    <Card className="animate-rise divide-y divide-border">
      {items.map((t, i) => {
        const paid = t.status === "paid";
        const isInstallment = !!(t.installment_total && t.installment_total > 1);
        const hasGroup = !!t.purchase_group_id;
        return (
          <div
            key={t.id}
            className="animate-rise group flex items-start gap-3 p-3 transition-all duration-150 hover:translate-x-0.5 hover:bg-muted/40 sm:items-center sm:p-4"
            style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
          >
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => onToggle({ id: t.id, paid: e.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-border accent-[oklch(0.55_0.22_260)] transition-transform active:scale-90 sm:mt-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`truncate text-sm font-medium ${paid ? "line-through text-muted-foreground" : ""}`}>
                  {t.description}
                  {showInstallment && isInstallment && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t.installment_number}/{t.installment_total})
                    </span>
                  )}
                </p>
                {t.is_recurring && <Repeat2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(t.due_date + "T00:00:00"), "dd/MM/yyyy")}</span>
                {t.categories && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: t.categories.color + "22", color: t.categories.color }}
                  >
                    {t.categories.name}
                  </span>
                )}
              </div>
              {/* Ações e valor em linha própria no mobile */}
              <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
                <span className={`text-sm font-semibold ${incomeMode ? "text-success" : ""} ${paid ? "line-through text-muted-foreground" : ""}`}>
                  {brl(Number(t.amount))}
                </span>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="group" onClick={() => onEdit(t)} title="Editar">
                    <Pencil className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
                  </Button>
                  <Button variant="ghost" size="icon" className="group" onClick={() => onDelete(t.id)} title="Excluir este">
                    <Trash2 className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
                  </Button>
                  {hasGroup && (
                    <Button
                      variant="ghost"
                      className="group"
                      size="icon"
                      onClick={() => {
                        const msg = isInstallment
                          ? `Remover todas as ${t.installment_total} parcelas desta compra?`
                          : "Remover esta conta de todos os meses?";
                        if (confirm(msg)) onDeleteGroup(t.purchase_group_id!);
                      }}
                      title="Excluir de todos os meses"
                    >
                      <Trash2 className="h-4 w-4 text-destructive transition-transform duration-150 group-hover:scale-110" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <span className={`hidden text-sm font-semibold sm:inline ${incomeMode ? "text-success" : ""} ${paid ? "line-through text-muted-foreground" : ""}`}>
              {brl(Number(t.amount))}
            </span>
            <div className="hidden items-center sm:flex">
              <Button variant="ghost" size="icon" className="group" onClick={() => onEdit(t)} title="Editar">
                <Pencil className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
              </Button>
              <Button variant="ghost" size="icon" className="group" onClick={() => onDelete(t.id)} title="Excluir este">
                <Trash2 className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
              </Button>
              {hasGroup && (
                <Button
                  variant="ghost"
                  className="group"
                  size="icon"
                  onClick={() => {
                    const msg = isInstallment
                      ? `Remover todas as ${t.installment_total} parcelas desta compra?`
                      : "Remover esta conta de todos os meses?";
                    if (confirm(msg)) onDeleteGroup(t.purchase_group_id!);
                  }}
                  title="Excluir de todos os meses"
                >
                  <Trash2 className="h-4 w-4 text-destructive transition-transform duration-150 group-hover:scale-110" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function TransactionForm({
  onSaved,
  defaultMonth,
  editing,
}: {
  onSaved: () => void;
  defaultMonth: Date;
  editing: Tx | null;
}) {
  const isEdit = !!editing;
  const [type, setType] = useState<"expense" | "income">((editing?.type as any) ?? "expense");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [dueDate, setDueDate] = useState(editing?.due_date ?? format(defaultMonth, "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string | undefined>(editing?.category_id ?? undefined);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "boleto" | "other">(
    (editing?.payment_method as any) ?? "pix",
  );
  const [cardId, setCardId] = useState<string | undefined>(editing?.card_id ?? undefined);
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring] = useState(editing?.is_recurring ?? false);
  const [months, setMonths] = useState(6);
  const [applyToAll, setApplyToAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredCats = cats.filter((c) => c.kind === type);
  const isCard = type === "expense" && paymentMethod === "card";
  const isInstallmentPurchase = !isEdit && isCard && installments > 1;
  const hasGroup = !!editing?.purchase_group_id;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getSession();
    if (!userData.session) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }

    const method = type === "income" ? "pix" : paymentMethod;

    if (isEdit && editing) {
      const patch: any = {
        description,
        amount: Number(amount),
        due_date: dueDate,
        type,
        category_id: categoryId ?? null,
        payment_method: method,
        card_id: isCard ? cardId ?? null : null,
      };
      let q = supabase.from("transactions").update(patch);
      if (applyToAll && hasGroup) {
        // don't overwrite due_date across the group
        delete patch.due_date;
        q = supabase.from("transactions").update(patch).eq("purchase_group_id", editing.purchase_group_id!);
      } else {
        q = q.eq("id", editing.id);
      }
      const { error } = await q;
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success(applyToAll && hasGroup ? "Atualizado em todos os meses" : "Atualizado");
      return onSaved();
    }

    const totalAmount = Number(amount);
    const base = {
      user_id: userData.session.user.id,
      description,
      type,
      category_id: categoryId ?? null,
      is_recurring: isRecurring && !isInstallmentPurchase,
      status: "pending" as const,
      payment_method: method,
      card_id: isCard ? cardId ?? null : null,
    };

    const rows: any[] = [];

    if (isInstallmentPurchase) {
      const per = Number((totalAmount / installments).toFixed(2));
      const groupId = crypto.randomUUID();
      const d = new Date(dueDate + "T00:00:00");
      for (let i = 0; i < installments; i++) {
        const next = addMonths(d, i);
        rows.push({
          ...base,
          amount: per,
          due_date: format(next, "yyyy-MM-dd"),
          installment_number: i + 1,
          installment_total: installments,
          purchase_group_id: groupId,
          description: `${description} (${i + 1}/${installments})`,
        });
      }
    } else if (isRecurring) {
      const groupId = crypto.randomUUID();
      const d = new Date(dueDate + "T00:00:00");
      for (let i = 0; i < months; i++) {
        const next = addMonths(d, i);
        rows.push({
          ...base,
          amount: totalAmount,
          due_date: format(next, "yyyy-MM-dd"),
          purchase_group_id: groupId,
        });
      }
    } else {
      rows.push({ ...base, amount: totalAmount, due_date: dueDate });
    }

    const { error } = await supabase.from("transactions").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(
      isInstallmentPurchase
        ? `${installments} parcelas criadas`
        : isRecurring
          ? `${months} contas criadas`
          : "Conta adicionada",
    );
    onSaved();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar conta" : "Nova conta"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Tabs value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">A pagar</TabsTrigger>
            <TabsTrigger value="income">A receber</TabsTrigger>
          </TabsList>
        </Tabs>
        <div>
          <Label htmlFor="desc">Descrição</Label>
          <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amt">Valor {isInstallmentPurchase && <span className="text-xs text-muted-foreground">(total)</span>}</Label>
            <Input id="amt" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="due">{isInstallmentPurchase ? "1ª parcela" : "Vencimento"}</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
        </div>

        {type === "expense" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isCard && (
              <div>
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cards.length === 0 && <div className="p-2 text-xs text-muted-foreground">Cadastre um cartão primeiro</div>}
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {!isEdit && isCard && (
          <div>
            <Label htmlFor="inst">Parcelas</Label>
            <Input
              id="inst"
              type="number"
              min="1"
              max="60"
              value={installments}
              onChange={(e) => setInstallments(Math.max(1, Number(e.target.value)))}
            />
            {isInstallmentPurchase && amount && (
              <p className="mt-1 text-xs text-muted-foreground">
                {installments}× de {brl(Number(amount) / installments)}
              </p>
            )}
          </div>
        )}

        <div>
          <Label>Categoria</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {filteredCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isEdit && !isInstallmentPurchase && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="rec" className="cursor-pointer">Repetir todo mês</Label>
              <p className="text-xs text-muted-foreground">Cria a mesma conta nos próximos meses</p>
            </div>
            <Switch id="rec" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}
        {!isEdit && isRecurring && !isInstallmentPurchase && (
          <div>
            <Label htmlFor="mo">Por quantos meses?</Label>
            <Input id="mo" type="number" min="2" max="60" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
          </div>
        )}

        {isEdit && hasGroup && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="all" className="cursor-pointer">Aplicar em todos os meses</Label>
              <p className="text-xs text-muted-foreground">Atualiza todas as ocorrências desta conta (exceto a data)</p>
            </div>
            <Switch id="all" checked={applyToAll} onCheckedChange={setApplyToAll} />
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
