import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account-request")({
  beforeLoad: () => {
    throw redirect({ to: "/accounts", replace: true });
  },
});
