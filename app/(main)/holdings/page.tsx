import { auth } from "@/auth";
import { getHoldings } from "@/lib/db/queries/holdings";
import { HoldingsList } from "@/components/holdings/holdings-list";
import { DigestProvider } from "@/components/holdings/market-bar";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const allHoldings = await getHoldings(userId);
  const inferred = allHoldings.filter((h) => h.inferred);
  const real     = allHoldings.filter((h) => !h.inferred);
  const hasHolding = allHoldings.some((h) => h.status === "HOLDING");

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-4">
      <DigestProvider hasHolding={hasHolding}>
        <HoldingsList holdings={real} inferred={inferred} />
      </DigestProvider>
    </div>
  );
}
