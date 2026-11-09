import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="brand brand-photo"
      aria-label="Eddu Barber Studio · Inicio"
    >
      <Image
        src="/brand/eddu-logo.png"
        alt="EDDU Barber Studio"
        width={2048}
        height={800}
        sizes="180px"
      />
    </Link>
  );
}
