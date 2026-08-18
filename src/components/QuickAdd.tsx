import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Lançamento rápido: disponível em qualquer tela do app. */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const reset = () => {
    setDescription("");
    setAmount("");
    setCategoryId(undefined);
    setDueDate(format(new Date(), "yyyy-MM-dd"));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(String(amount).replace(",", "."));
    if (!description.trim() || !value) return toast.error("Informe descrição e valor");
    setSaving(true);
    const { data: userData } = await supabase.auth.getSession();
    if (!userData.session) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }
    const { error } = await supabase.from("transactions").insert({
      user_id: userData.session.user.id,
      description: description.trim(),
      amount: value,
      type,
      due_date: dueDate,
      category_id: categoryId ?? null,
      payment_method: "pix",
      status: "pending",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(type === "expense" ? "Conta adicionada" : "Recebimento adicionado");
    qc.invalidateQueries({ queryKey: ["tx"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    reset();
    setOpen(false);
  };

  const filteredCats = cats.filter((c) => c.kind === type);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Novo lançamento"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançamento rápido</DialogTitle>
            <DialogDescription>Registre em segundos e ajuste os detalhes depois.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "expense", label: "Saída", icon: ArrowDownCircle },
                  { key: "income", label: "Entrada", icon: ArrowUpCircle },
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => {
                    setType(o.key);
                    setCategoryId(undefined);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    type === o.key
                      ? o.key === "expense"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-success/40 bg-success/10 text-success"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <o.icon className="h-4 w-4" />
                  {o.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qa-desc">Descrição</Label>
              <Input
                id="qa-desc"
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Conta de luz"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qa-amount">Valor (R$)</Label>
                <Input
                  id="qa-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-date">Vencimento</Label>
                <Input
                  id="qa-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Link
                to="/transactions"
                onClick={() => setOpen(false)}
                className="self-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Formulário completo
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
