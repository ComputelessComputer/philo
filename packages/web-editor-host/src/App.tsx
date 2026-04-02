export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "#f5f1e8",
        color: "#1b1b18",
      }}
    >
      <section
        style={{
          width: "min(520px, calc(100vw - 32px))",
          padding: "28px",
          border: "1px solid rgba(27, 27, 24, 0.12)",
          background: "rgba(255, 255, 255, 0.8)",
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55, }}>
          Philo
        </p>
        <h1 style={{ margin: "12px 0 0", fontSize: "28px", lineHeight: 1.1, }}>
          Web editor host scaffold
        </h1>
        <p style={{ margin: "16px 0 0", fontSize: "15px", lineHeight: 1.6, opacity: 0.78, }}>
          This package will host the shared editor and widget runtime for desktop and mobile surfaces.
        </p>
      </section>
    </main>
  );
}
