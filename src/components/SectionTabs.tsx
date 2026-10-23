import { Link, useLocation } from "@tanstack/react-router";
import { SECTIONS, itemActive, sectionOf, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const pill = (active: boolean) =>
  cn(
    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-muted/70 text-muted-foreground hover:text-foreground",
  );

const strip = "no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0";

/** Abas da seção atual. Seções com grupos (Meu trabalho) mostram os grupos e, abaixo, as telas do grupo. */
export function SectionTabs() {
  const { pathname } = useLocation();
  const section = sectionOf(pathname) ?? SECTIONS[0];
  if (section.items.length < 2) return null;

  const grouped = section.items.some((i) => i.group);
  if (!grouped) {
    return (
      <nav aria-label={section.label} className={cn(strip, "mx-auto mb-5 max-w-6xl")}>
        {section.items.map((i) => (
          <Link key={i.to} to={i.to} className={pill(itemActive(pathname, i.to))}>
            <i.icon className="h-4 w-4" />
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }

  const groups: { name: string; items: NavItem[] }[] = [];
  for (const i of section.items) {
    const g = groups.find((x) => x.name === i.group);
    if (g) g.items.push(i);
    else groups.push({ name: i.group!, items: [i] });
  }
  const current = groups.find((g) => g.items.some((i) => itemActive(pathname, i.to))) ?? groups[0];
  return (
    <div className="mx-auto mb-5 max-w-6xl space-y-2">
      <nav aria-label={section.label} className={strip}>
        {groups.map((g) => (
          <Link key={g.name} to={g.items[0].to} className={pill(g === current)}>
            {g.name}
          </Link>
        ))}
      </nav>
      {current.items.length > 1 && (
        <nav aria-label={current.name} className={strip}>
          {current.items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "shrink-0 border-b-2 px-2 py-1.5 text-sm font-medium transition-colors",
                itemActive(pathname, i.to)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
