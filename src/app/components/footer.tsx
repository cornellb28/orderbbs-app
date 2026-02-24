import Link from "next/link";

type FooterProps = {
    isAdmin?: boolean;
};

export default function Footer({ isAdmin = false }: FooterProps) {
    return (
        <footer
            style={{
                marginTop: "5rem",
                padding: "3rem 1.5rem 2rem",
                borderTop: "1px solid #eee",
                opacity: 0.85,
            }}
        >
            <div
                style={{
                    maxWidth: 720,
                    margin: "0 auto",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "2rem",
                }}
            >
                {/* Brand */}
                <div>
                    <strong>Bowl & Broth Society</strong>
                    <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                        Japanese comfort food made in small batches.
                        <br />
                        Weekly drops · Limited quantities · Pickup only.
                    </p>
                </div>

                {/* Customer info */}
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
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
                <div style={{ fontSize: 13, opacity: 0.7 }}>

                    <div>© {new Date().getFullYear()} Bowl & Broth Society</div>
                </div>
            </div>
        </footer>
    );
}