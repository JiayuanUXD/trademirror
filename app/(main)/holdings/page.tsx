import { auth } from "@/auth";
import { getHoldings } from "@/lib/db/queries/holdings";
import { HoldingsList } from "@/components/holdings/holdings-list";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const allHoldings = await getHoldings(userId);
  const inferred = allHoldings.filter((h) => h.inferred);
  const real     = allHoldings.filter((h) => !h.inferred);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-4">
      <HoldingsList holdings={real} inferred={inferred} />
    </div>
  );
}
