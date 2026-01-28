import { BottomNav } from "@/components/BottomNav";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-slate-950">
            <main className="min-h-screen pb-20">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
