import Dashboard from "@/components/dashboard/Dashboard";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <Dashboard />
    </main>
  );
}
