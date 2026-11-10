import { ArrowUpRight } from "lucide-react";

export function InstagramSection() {
  return (
    <section className="instagram-section" aria-labelledby="instagram-title">
      <div className="instagram-identity">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        <div>
          <h2 id="instagram-title">Instagram</h2>
          <p>@eddu_barber__studio</p>
        </div>
      </div>
      <a
        className="instagram-link"
        href="https://www.instagram.com/eddu_barber__studio/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver el perfil de Eddu Barber en Instagram (abre en otra pestaña)"
      >
        Ver perfil <ArrowUpRight size={20} aria-hidden="true" />
      </a>
    </section>
  );
}
