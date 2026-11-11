import { AuthGate } from "@/components/AuthGate";
import { HomeDashboard } from "@/components/HomeDashboard";

export default function HomePage() {
  return (
    <AuthGate mode="protected">
      <HomeDashboard />
    </AuthGate>
  );
}
