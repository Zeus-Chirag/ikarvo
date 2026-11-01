import { useState } from "react";

import { Button } from "~/components/Button";
import { PlanCard } from "~/components/PlanCard";

export function Billing() {
  const [loading, setLoading] = useState(false);

  return (
    <section>
      <h2>Billing</h2>
      <p>Manage your plan and payment methods.</p>
      <ul>
        <li>
          <PlanCard name="Free" price="$0" />
        </li>
        <li>
          <PlanCard name="Pro" price="$20" />
        </li>
      </ul>
      <Button
        loading={loading}
        onClick={() => setLoading(true)}
      >
        Upgrade
      </Button>
    </section>
  );
}
