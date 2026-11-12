import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";

/** Every page in the (app) group requires a signed-in user. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate mode="protected">
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
