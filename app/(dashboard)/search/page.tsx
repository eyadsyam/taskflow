import { SearchClient } from "./search-client";

export const dynamic = "force-dynamic";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label mb-1">Search</div>
          <h1 className="text-3xl font-bold tracking-tight">بحث ذكي</h1>
          <p className="text-sm text-muted-foreground mt-1">
            اكتب بلغتك الطبيعية — مثلاً &quot;كل تاسكات Big Data اللي شغالة دلوقتي&quot;
          </p>
        </div>
      </section>
      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <SearchClient initialQuery={searchParams.q ?? ""} />
        </div>
      </section>
    </div>
  );
}
