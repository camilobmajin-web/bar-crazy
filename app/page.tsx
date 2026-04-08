"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pronostico = {
  id: number;
  created_at: string;
  nombre: string;
  partido: string;
  goles_local: number;
  goles_visitante: number;
  negocio: string | null;
  premio: string | null;
  fecha_hora: string | null;
};

export default function Home() {
  const [nombreNegocio, setNombreNegocio] = useState("Bar Crazy");
  const [partido, setPartido] = useState("Real Madrid vs Atlético de Madrid");
  const [premio, setPremio] = useState("1 consumición gratis");
  const [fechaHora, setFechaHora] = useState("Sábado · 21:00");

  const [modoTV, setModoTV] = useState(false);
  const [mostrarPronosticos, setMostrarPronosticos] = useState(false);

  const [nombre, setNombre] = useState("");
  const [golesLocal, setGolesLocal] = useState("");
  const [golesVisitante, setGolesVisitante] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [resultadoFinalLocal, setResultadoFinalLocal] = useState("");
  const [resultadoFinalVisitante, setResultadoFinalVisitante] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"recientes" | "nombre">("recientes");

  const [pronosticos, setPronosticos] = useState<Pronostico[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargarPronosticos() {
    setCargando(true);

    const { data, error } = await supabase
      .from("pronosticos")
      .select("*")
      .eq("negocio", nombreNegocio)
      .eq("partido", partido)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMensaje("Error al cargar participantes");
    } else {
      setPronosticos(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarPronosticos();
  }, [nombreNegocio, partido]);

  async function enviarPronostico() {
    setMensaje("");

    if (!nombre.trim()) {
      setMensaje("Escribe tu nombre.");
      return;
    }

    if (golesLocal === "" || golesVisitante === "") {
      setMensaje("Pon ambos resultados.");
      return;
    }

    const nombreNormalizado = nombre.trim().toLowerCase();

    const yaExiste = pronosticos.some(
      (p) => p.nombre.trim().toLowerCase() === nombreNormalizado
    );

    if (yaExiste) {
      setMensaje("Ese nombre ya participó.");
      return;
    }

    const { error } = await supabase.from("pronosticos").insert([
      {
        nombre: nombre.trim(),
        partido,
        goles_local: Number(golesLocal),
        goles_visitante: Number(golesVisitante),
        negocio: nombreNegocio,
        premio,
        fecha_hora: fechaHora,
      },
    ]);

    if (error) {
      console.error(error);
      setMensaje("Error al guardar: " + error.message);
      return;
    }

    setNombre("");
    setGolesLocal("");
    setGolesVisitante("");
    setMensaje("✅ Pronóstico guardado");
    cargarPronosticos();
  }

  async function borrarTodo() {
    const confirmado = window.confirm("¿Seguro que quieres borrar todos los pronósticos?");
    if (!confirmado) return;

    const { error } = await supabase
      .from("pronosticos")
      .delete()
      .eq("negocio", nombreNegocio)
      .eq("partido", partido);

    if (error) {
      console.error(error);
      setMensaje("Error al borrar");
      return;
    }

    setPronosticos([]);
    setResultadoFinalLocal("");
    setResultadoFinalVisitante("");
    setMensaje("Pronósticos borrados.");
  }

  async function borrarParticipante(id: number) {
    const confirmado = window.confirm("¿Quieres borrar este participante?");
    if (!confirmado) return;

    const { error } = await supabase.from("pronosticos").delete().eq("id", id);

    if (error) {
      console.error(error);
      setMensaje("Error al borrar participante");
      return;
    }

    setMensaje("Participante borrado.");
    cargarPronosticos();
  }

  async function copiarLista() {
    if (pronosticos.length === 0) {
      setMensaje("No hay pronósticos para copiar.");
      return;
    }

    const texto = [
      `${nombreNegocio}`,
      `Partido: ${partido}`,
      `Premio: ${premio}`,
      `Fecha: ${fechaHora}`,
      "",
      "LISTA DE PARTICIPANTES",
      ...pronosticos.map(
        (p, i) => `${i + 1}. ${p.nombre} -> ${p.goles_local}-${p.goles_visitante}`
      ),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(texto);
      setMensaje("📋 Lista copiada");
    } catch {
      setMensaje("No se pudo copiar la lista.");
    }
  }

  const pronosticosFiltrados = useMemo(() => {
    let lista = [...pronosticos];

    if (busqueda.trim()) {
      lista = lista.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
      );
    }

    if (orden === "nombre") {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      lista.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return lista;
  }, [pronosticos, busqueda, orden]);

  const ganadores = useMemo(() => {
    if (resultadoFinalLocal === "" || resultadoFinalVisitante === "") return [];

    const finalLocal = Number(resultadoFinalLocal);
    const finalVisitante = Number(resultadoFinalVisitante);

    const puntuados = pronosticos.map((p) => {
      const pl = Number(p.goles_local);
      const pv = Number(p.goles_visitante);

      let puntos = 0;

      const exacto = pl === finalLocal && pv === finalVisitante;

      const signoPronostico =
        pl > pv ? "local" : pl < pv ? "visitante" : "empate";
      const signoFinal =
        finalLocal > finalVisitante
          ? "local"
          : finalLocal < finalVisitante
          ? "visitante"
          : "empate";

      if (exacto) {
        puntos = 3;
      } else if (signoPronostico === signoFinal) {
        puntos = 1;
      }

      const distancia =
        Math.abs(pl - finalLocal) + Math.abs(pv - finalVisitante);

      return { ...p, puntos, distancia };
    });

    puntuados.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      return a.distancia - b.distancia;
    });

    const mejor = puntuados[0];
    if (!mejor) return [];

    return puntuados.filter(
      (p) => p.puntos === mejor.puntos && p.distancia === mejor.distancia
    );
  }, [pronosticos, resultadoFinalLocal, resultadoFinalVisitante]);

  const panelStyle = {
    background: "rgba(31, 41, 55, 0.78)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    padding: modoTV ? "32px" : "24px",
    borderRadius: "24px",
    border: "1px solid rgba(255,255,255,0.08)",
  } as const;

  const inputStyle = {
    width: "100%",
    padding: modoTV ? "16px" : "12px",
    borderRadius: "14px",
    border: "1px solid #374151",
    background: "#111827",
    color: "white",
    boxSizing: "border-box" as const,
    fontSize: modoTV ? "20px" : "16px",
  };

  const smallButtonStyle = {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid #4b5563",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold" as const,
  };

  const fullButtonStyle = {
    width: "100%",
    padding: modoTV ? "16px" : "12px",
    borderRadius: "14px",
    border: "1px solid #4b5563",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontSize: modoTV ? "18px" : "15px",
    fontWeight: "bold" as const,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.35), transparent 25%), radial-gradient(circle at top right, rgba(168,85,247,0.25), transparent 20%), linear-gradient(135deg, #020617, #0f172a, #111827)",
        color: "white",
        padding: modoTV ? "32px" : "24px",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>
        {`
          @keyframes floatBall {
            0% { transform: translate(0px, 0px) rotate(0deg); }
            25% { transform: translate(30px, -20px) rotate(90deg); }
            50% { transform: translate(0px, -35px) rotate(180deg); }
            75% { transform: translate(-30px, -15px) rotate(270deg); }
            100% { transform: translate(0px, 0px) rotate(360deg); }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 0px rgba(255,255,255,0.15); }
            50% { box-shadow: 0 0 30px rgba(255,255,255,0.18); }
            100% { box-shadow: 0 0 0px rgba(255,255,255,0.15); }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: modoTV ? "30px" : "20px",
          right: modoTV ? "40px" : "24px",
          fontSize: modoTV ? "64px" : "42px",
          animation: "floatBall 6s ease-in-out infinite",
          filter: "drop-shadow(0 0 20px rgba(255,255,255,0.15))",
          pointerEvents: "none",
        }}
      >
        ⚽
      </div>

      <div
        style={{
          maxWidth: modoTV ? "1500px" : "1280px",
          margin: "0 auto",
          display: "grid",
          gap: "24px",
          gridTemplateColumns: modoTV ? "1.1fr 1fr 1fr" : "1fr 1fr 1fr",
        }}
      >
        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>Configuración general</p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setMostrarPronosticos(!mostrarPronosticos)}
                style={{
                  ...smallButtonStyle,
                  background: mostrarPronosticos ? "#f8fafc" : "#111827",
                  color: mostrarPronosticos ? "#111827" : "white",
                }}
              >
                {mostrarPronosticos ? "Ocultar pronósticos" : "Mostrar pronósticos"}
              </button>

              <button
                onClick={() => setModoTV(!modoTV)}
                style={{
                  ...smallButtonStyle,
                  background: modoTV ? "#f8fafc" : "#111827",
                  color: modoTV ? "#111827" : "white",
                }}
              >
                {modoTV ? "Salir modo TV" : "Modo TV"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Nombre del negocio
            </label>
            <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Partido
            </label>
            <input value={partido} onChange={(e) => setPartido(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Premio
            </label>
            <input value={premio} onChange={(e) => setPremio(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Fecha y hora
            </label>
            <input value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} style={inputStyle} />
          </div>

          <p style={{ color: "#94a3b8", marginBottom: "8px" }}>Partido de hoy</p>
          <h1 style={{ fontSize: modoTV ? "54px" : "34px", margin: "0 0 8px 0", lineHeight: 1.05 }}>
            {nombreNegocio} ⚽
          </h1>
          <h2 style={{ fontSize: modoTV ? "32px" : "22px", margin: "0 0 8px 0" }}>
            {partido}
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: modoTV ? "20px" : "16px", marginBottom: "6px" }}>
            {fechaHora}
          </p>
          <p style={{ color: "#d1d5db", marginBottom: "24px", fontSize: modoTV ? "22px" : "16px", fontWeight: "bold" }}>
            Premio: {premio}
          </p>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Tu nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Escribe tu nombre"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Goles local
              </label>
              <input
                value={golesLocal}
                onChange={(e) => setGolesLocal(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Goles visitante
              </label>
              <input
                value={golesVisitante}
                onChange={(e) => setGolesVisitante(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={enviarPronostico}
            style={{
              ...fullButtonStyle,
              background: "#f8fafc",
              color: "#111827",
              border: "none",
              marginBottom: "12px",
              animation: "glowPulse 3s ease-in-out infinite",
            }}
          >
            Enviar pronóstico
          </button>

          <div style={{ display: "grid", gap: "10px" }}>
            <button onClick={copiarLista} style={fullButtonStyle}>
              Copiar lista
            </button>

            <button onClick={borrarTodo} style={fullButtonStyle}>
              Borrar todos los pronósticos
            </button>
          </div>

          {mensaje && (
            <p style={{ marginTop: "16px", fontWeight: "bold" }}>
              {mensaje}
            </p>
          )}

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              borderRadius: "14px",
              background: "#0f172a",
              border: "1px solid #374151",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>📜 Reglas</h3>
            <ul style={{ color: "#9ca3af", fontSize: "14px", lineHeight: "1.7", paddingLeft: "18px" }}>
              <li>Solo se permite una participación por persona.</li>
              <li>El pronóstico debe hacerse antes de que empiece el partido.</li>
              <li>Se puede apostar a victoria local, visitante o empate.</li>
              <li>Gana quien acierte el resultado exacto.</li>
              <li>Si nadie acierta exacto, gana quien más se acerque.</li>
              <li>Primero cuenta acertar ganador o empate.</li>
              <li>Después cuenta la diferencia total de goles.</li>
              <li>Si sigue habiendo empate, el premio se reparte.</li>
              <li>La decisión final la toma el bar.</li>
            </ul>
          </div>
        </section>

        <section style={panelStyle}>
          <h3 style={{ fontSize: modoTV ? "40px" : "24px", marginTop: 0, marginBottom: "10px" }}>
            Participantes
          </h3>

          <p style={{ color: "#9ca3af", marginBottom: "14px" }}>
            Total: {pronosticos.length}
          </p>

          <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar participante"
              style={inputStyle}
            />

            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as "recientes" | "nombre")}
              style={inputStyle}
            >
              <option value="recientes">Orden: más recientes</option>
              <option value="nombre">Orden: por nombre</option>
            </select>
          </div>

          {cargando ? (
            <div style={{ marginTop: "16px", padding: "16px", borderRadius: "14px", background: "#111827", color: "#9ca3af" }}>
              Cargando participantes...
            </div>
          ) : pronosticosFiltrados.length === 0 ? (
            <div style={{ marginTop: "16px", padding: "16px", borderRadius: "14px", background: "#111827", color: "#9ca3af" }}>
              No hay participantes.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {pronosticosFiltrados.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: modoTV ? "20px" : "16px",
                    borderRadius: "14px",
                    background: "#111827",
                    border: "1px solid #374151",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: modoTV ? "26px" : "18px" }}>
                        {item.nombre}
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: modoTV ? "18px" : "14px" }}>
                        {item.partido}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: modoTV ? "24px" : "16px",
                        color: mostrarPronosticos ? "white" : "#9ca3af",
                        fontWeight: "bold",
                      }}
                    >
                      {mostrarPronosticos
                        ? `${item.goles_local} - ${item.goles_visitante}`
                        : "Pronóstico oculto"}
                    </div>
                  </div>

                  <button
                    onClick={() => borrarParticipante(item.id)}
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid #4b5563",
                      background: "#0f172a",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h3 style={{ fontSize: modoTV ? "40px" : "24px", marginTop: 0, marginBottom: "12px" }}>
            Resultado final y ganador
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Resultado final local
              </label>
              <input
                value={resultadoFinalLocal}
                onChange={(e) => setResultadoFinalLocal(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Resultado final visitante
              </label>
              <input
                value={resultadoFinalVisitante}
                onChange={(e) => setResultadoFinalVisitante(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>

          {resultadoFinalLocal !== "" && resultadoFinalVisitante !== "" && (
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "#111827",
                border: "1px solid #374151",
                marginBottom: "16px",
              }}
            >
              <div style={{ color: "#9ca3af", marginBottom: "8px" }}>
                Resultado cargado
              </div>
              <div style={{ fontSize: modoTV ? "34px" : "24px", fontWeight: "bold" }}>
                {resultadoFinalLocal} - {resultadoFinalVisitante}
              </div>
            </div>
          )}

          {ganadores.length === 0 ? (
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "#111827",
                color: "#9ca3af",
              }}
            >
              Introduce el resultado final para calcular ganador.
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "#111827",
                border: "1px solid #374151",
              }}
            >
              <div style={{ color: "#9ca3af", marginBottom: "10px" }}>
                Ganador{ganadores.length > 1 ? "es" : ""}
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {ganadores.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      background: "#0f172a",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: modoTV ? "24px" : "18px" }}>
                      {g.nombre}
                    </div>
                    <div style={{ color: "#9ca3af" }}>
                      Pronóstico: {g.goles_local} - {g.goles_visitante}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}