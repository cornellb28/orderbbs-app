import Link from "next/link";

type FooterProps = {
    isAdmin?: boolean;
};

export default function Footer({ isAdmin = false }: FooterProps) {
    return (
        <footer className="container">
            <div
                style={{
                    maxWidth: 720,
                    margin: "0 auto",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                }}
            >
                {/* Customer info */}
                <div className="d-flex flex-row gap-3">
                    <div>
                        <Link href="/preorder">Pre-order</Link>
                    </div>
                    <div>
                        <Link href="/about">About</Link>
                    </div>
                    <div>
                        <Link href="/faq">FAQ</Link>
                    </div>
                    <div>
                        <Link href="/contact">Contact</Link>
                    </div>
                    <div>
                        <Link
                            href="/admin?next=/login"
                            style={{ fontSize: 13, textDecoration: "underline", opacity: 0.7 }}
                        >
                            Admin
                        </Link>
                    </div>
                </div>

                {/* Meta */}
                <div className="text-end">

                    <div>© {new Date().getFullYear()} Bowl & Broth Society</div>
                </div>
            </div>
        </footer>
    );
}