"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>No pudimos cargar la página.</h1>
      <button onClick={reset}>Volver a intentar</button>
    </main>
  );
}
