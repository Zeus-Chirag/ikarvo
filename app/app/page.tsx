import { Suspense } from "react";

import { RequireAuth } from "~/lib/supabase/admin";
import { TeamSwitcher } from "~/components/TeamSwitcher";
import { Dashboard } from "~/components/Dashboard";

export default async function AppPage() {
  const user = await RequireAuth();

  return (
    <div>
      <header>
        <h1>Ikarvo</h1>
        <TeamSwitcher userId={user.id} />
      </header>
      <main>
        <Suspense fallback={<p>Loading dashboard…</p>}>
          <Dashboard userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}
