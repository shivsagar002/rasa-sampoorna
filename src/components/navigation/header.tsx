"use client";

import { SiteHeader } from "./site-header";

interface HeaderProps {
  isScrolled?: boolean;
}

export function Header({ isScrolled }: HeaderProps) {
  return <SiteHeader solidBackground={isScrolled} />;
}

export { SiteHeader };
