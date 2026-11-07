import { IconClientes, IconInicio, IconMais, IconProdutos, IconVendas } from "./icons";

export const NAV_ITEMS = [
  { href: "/", label: "Início", Icon: IconInicio },
  { href: "/clientes", label: "Clientes", Icon: IconClientes },
  { href: "/vendas", label: "Vendas", Icon: IconVendas },
  { href: "/produtos", label: "Produtos", Icon: IconProdutos },
  { href: "/mais", label: "Mais", Icon: IconMais },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
