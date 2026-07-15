import Link from "next/link";

type FooterProps = {
    isAdmin?: boolean;
};

export default function Footer({ isAdmin = false }: FooterProps) {
    return (
        <footer className="border-t mt-12">
            <div className="max-w-[720px] mx-auto grid grid-cols-2 gap-4 py-6 px-6">
                <div className="flex flex-row gap-4 text-sm">
                    <Link href="/preorder" className="hover:underline">Pre-order</Link>
                    <Link href="/about" className="hover:underline">About</Link>
                    <Link href="/faq" className="hover:underline">FAQ</Link>
                    <Link href="/contact" className="hover:underline">Contact</Link>
                    <Link href={isAdmin ? "/admin" : "/admin/login"} className="text-xs underline opacity-70">
                        {isAdmin ? "Dashboard" : "Admin"}
                    </Link>
                </div>

                <div className="text-right text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Bowl & Broth Society
                </div>
            </div>
        </footer>
    );
}
