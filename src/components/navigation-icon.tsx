import type { SVGProps } from "react";
export type NavigationIconName = "dashboard" | "wallet" | "calendar" | "more" | "plus" | "movements" | "settings" | "gift" | "income" | "close";
const paths: Record<NavigationIconName, string[]> = {
  dashboard: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  wallet: ["M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7", "M20 11h-5v6h5M17 14h.01"],
  calendar: ["M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 11h18M7 15h2M13 15h2"],
  more: ["M5 12h.01M12 12h.01M19 12h.01"],
  plus: ["M12 5v14M5 12h14"],
  movements: ["M4 7h15l-4-4M20 17H5l4 4M19 7v3M5 17v-3"],
  settings: ["M4 7h16M4 17h16M8 4v6M16 14v6"],
  gift: ["M3 8h18v4H3zM5 12v9h14v-9M12 8v13", "M12 8H8a2.5 2.5 0 1 1 2.4-3.2L12 8Zm0 0h4a2.5 2.5 0 1 0-2.4-3.2L12 8Z"],
  income: ["M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"],
  close: ["M6 6l12 12M18 6 6 18"],
};
export function NavigationIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: NavigationIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 4 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name].map((path,index) => <path key={index} d={path} />)}</svg>;
}
