export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="marketing-scroll" className="h-dvh overflow-y-auto bg-white text-slate-900">
      {children}
    </div>
  );
}
