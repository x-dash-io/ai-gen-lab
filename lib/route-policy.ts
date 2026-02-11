export const ADMIN_ROUTE_PREFIXES = ["/admin"] as const;

export const AUTH_REQUIRED_ROUTE_PREFIXES = [
  "/dashboard",
  "/library",
  "/profile",
  "/activity",
] as const;

export const CUSTOMER_ONLY_ROUTE_PREFIXES = [
  "/dashboard",
  "/library",
  "/profile",
  "/activity",
] as const;

export const DEFAULT_REDIRECTS = {
  signIn: "/sign-in",
  adminHome: "/admin",
  customerHome: "/dashboard",
} as const;

export function pathMatchesPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export function isAdminRoute(pathname: string) {
  return pathMatchesPrefix(pathname, ADMIN_ROUTE_PREFIXES);
}

export function requiresAuthRoute(pathname: string) {
  return pathMatchesPrefix(pathname, AUTH_REQUIRED_ROUTE_PREFIXES);
}

export function isCustomerOnlyRoute(pathname: string) {
  return pathMatchesPrefix(pathname, CUSTOMER_ONLY_ROUTE_PREFIXES);
}
