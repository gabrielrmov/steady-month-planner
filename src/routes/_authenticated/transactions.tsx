import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Repeat2, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
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
  installment_number: number | null;
  installment_total: number | null;
  purchase_group_id: string | null;
  categories?: { name: string; color: string } | null;
  cards?: { name: string; color: string } | null;
};

function TransactionsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
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

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tx"] });
      toast.success("Removido");
    },
  });

  const delGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("transactions").delete().eq("purchase_group_id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["installments"] });
      toast.success("Todas as parcelas removidas");
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

  const pixExpenses = txs.filter((t) => t.type === "expense" && t.payment_method !== "card");
  const cardExpenses = txs.filter((t) => t.type === "expense" && t.payment_method === "card");
  const incomes = txs.filter((t) => t.type === "income");

  // Group card expenses by card
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-sm text-muted-foreground">Gerencie contas a pagar e receber</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova</Button>
            </DialogTrigger>
            <TransactionForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["tx"] }); qc.invalidateQueries({ queryKey: ["installments"] }); }} defaultMonth={month} />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="pix">
        <TabsList>
          <TabsTrigger value="pix">Pix / Boleto ({pixExpenses.length})</TabsTrigger>
          <TabsTrigger value="cards">Cartões ({cardExpenses.length})</TabsTrigger>
          <TabsTrigger value="income">A receber ({incomes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pix" className="mt-4">
          <TxList items={pixExpenses} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} />
        </TabsContent>
        <TabsContent value="cards" className="mt-4 space-y-4">
          {!isLoading && cardsGrouped.size === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">Nenhuma compra no cartão neste mês.</Card>
          )}
          {[...cardsGrouped.entries()].map(([key, group]) => {
            const total = group.items.reduce((s, i) => s + Number(i.amount), 0);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: group.color + "22", color: group.color }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <span className="ml-auto text-sm font-semibold">{brl(total)}</span>
                </div>
                <TxList items={group.items} loading={false} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} showInstallment />
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <TxList items={incomes} loading={isLoading} onToggle={togglePaid.mutate} onDelete={del.mutate} onDeleteGroup={delGroup.mutate} incomeMode />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TxList({
  items,
  loading,
  onToggle,
  onDelete,
  onDeleteGroup,
  incomeMode,
  showInstallment,
}: {
  items: Tx[];
  loading: boolean;
  onToggle: (p: { id: string; paid: boolean }) => void;
  onDelete: (id: string) => void;
  onDeleteGroup: (groupId: string) => void;
  incomeMode?: boolean;
  showInstallment?: boolean;
}) {
  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Carregando...</Card>;
  if (items.length === 0)
    return <Card className="p-10 text-center text-sm text-muted-foreground">Nada por aqui neste mês.</Card>;
  return (
    <Card className="divide-y divide-border">
      {items.map((t) => {
        const paid = t.status === "paid";
        return (
          <div key={t.id} className="flex items-center gap-3 p-4">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => onToggle({ id: t.id, paid: e.target.checked })}
              className="h-5 w-5 rounded border-border accent-[oklch(0.55_0.22_260)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`truncate text-sm font-medium ${paid ? "line-through text-muted-foreground" : ""}`}>
                  {t.description}
                  {showInstallment && t.installment_total && t.installment_total > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t.installment_number}/{t.installment_total})
                    </span>
                  )}
                </p>
                {t.is_recurring && <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />}
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
            </div>
            <span className={`text-sm font-semibold ${incomeMode ? "text-success" : ""} ${paid ? "line-through text-muted-foreground" : ""}`}>
              {brl(Number(t.amount))}
            </span>
            {t.purchase_group_id && t.installment_total && t.installment_total > 1 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remover todas as ${t.installment_total} parcelas desta compra?`)) {
                    onDeleteGroup(t.purchase_group_id!);
                  }
                }}
                title="Remover compra inteira"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function TransactionForm({ onSaved, defaultMonth }: { onSaved: () => void; defaultMonth: Date }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(format(defaultMonth, "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "boleto" | "other">("pix");
  const [cardId, setCardId] = useState<string | undefined>();
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [months, setMonths] = useState(6);
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
  const isInstallmentPurchase = isCard && installments > 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }

    const totalAmount = Number(amount);
    const method = type === "income" ? "pix" : paymentMethod;
    const base = {
      user_id: userData.user.id,
      description,
      type,
      category_id: categoryId ?? null,
      is_recurring: isRecurring && !isInstallmentPurchase,
      status: "pending" as const,
      payment_method: method,
      card_id: isCard ? cardId ?? null : null,
    };

    let rows: any[] = [];

    if (isInstallmentPurchase) {
      // Split into installments
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
    } else {
      const first = { ...base, amount: totalAmount, due_date: dueDate };
      rows.push(first);
      if (isRecurring) {
        const d = new Date(dueDate + "T00:00:00");
        for (let i = 1; i < months; i++) {
          const next = addMonths(d, i);
          rows.push({ ...first, due_date: format(next, "yyyy-MM-dd") });
        }
      }
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
        <DialogTitle>Nova conta</DialogTitle>
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

        {isCard && (
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

        {!isInstallmentPurchase && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="rec" className="cursor-pointer">Repetir todo mês</Label>
              <p className="text-xs text-muted-foreground">Cria a mesma conta nos próximos meses</p>
            </div>
            <Switch id="rec" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}
        {isRecurring && !isInstallmentPurchase && (
          <div>
            <Label htmlFor="mo">Por quantos meses?</Label>
            <Input id="mo" type="number" min="2" max="60" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
