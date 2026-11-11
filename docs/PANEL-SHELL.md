# Panel shell

`apps/app/src/components/panels/shell.tsx` exports `PanelShell` and `PanelShellProps` for client-rendered panel layouts. Server callers provide all identity and navigation data; shell does not fetch session or organization state.

```tsx
<PanelShell
  title="Painel"
  nav={[{ label: "Visão geral", href: "/panel" }]}
  orgOptions={[{ id: organization.id, name: organization.name, href: `/organizations/${organization.id}` }]}
  currentOrg={{ id: organization.id, name: organization.name }}
  user={{ name: session.user.name, email: session.user.email }}
  locale={locale}
  theme={theme}
>
  {children}
</PanelShell>
```

`initialCollapsed` optionally sets initial desktop sidebar state from server-provided preference; toggles persist `sidebar=open` or `sidebar=collapsed` in cookie. `showNotifications` opts into existing notifications component; provide `tenantIdentifier` for organization-scoped notifications. Logout reports failures and re-enables sign-out button. Theme and locale defaults stay stable for hydration; parent server layout should read their cookies and pass `theme`/`locale`.
