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
  const [premioTexto, setPremioTexto] = useState("1 consumición gratis");
  const [fechaHora, setFechaHora] = useState("Sábado · 21:00");

  const [precioEntrada, setPrecioEntrada] = useState("5");
  const [porcentajePremio, setPorcentajePremio] = useState("70");
  const [porcentajeBar, setPorcentajeBar] = useState("20");

  const [modoTV, setModoTV] = useState(false);
  const [mostrarPronosticos, setMostrarPronosticos] = useState(false);
  const [mostrarGanadorTV, setMostrarGanadorTV] = useState(false);
  const [apuestasCerradas, setApuestasCerradas] = useState(false);

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

    if (apuestasCerradas) {
      setMensaje("Las apuestas están cerradas.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Escribe tu nombre.");
      return;
    }

    if (golesLocal === "" || golesVisitante === "") {
      setMensaje("Pon ambos resultados.");
      return;
    }

    if (Number(golesLocal) < 0 || Number(golesVisitante) < 0) {
      setMensaje("Los goles no pueden ser negativos.");
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
        premio: premioTexto,
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
    setMostrarGanadorTV(false);
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
      `Premio anunciado: ${premioTexto}`,
      `Fecha: ${fechaHora}`,
      `Precio participación: ${precioEntrada}€`,
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

  const totalJugadores = pronosticos.length;
  const precio = Number(precioEntrada) || 0;
  const boteTotal = totalJugadores * precio;
  const pctPremio = Number(porcentajePremio) || 0;
  const pctBar = Number(porcentajeBar) || 0;
  const montoPremio = Math.max(0, Math.round((boteTotal * pctPremio) / 100));
  const montoBar = Math.max(0, Math.round((boteTotal * pctBar) / 100));
  const montoSistema = Math.max(0, boteTotal - montoPremio - montoBar);

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
    background: "rgba(17, 24, 39, 0.78)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    padding: modoTV ? "32px" : "24px",
    borderRadius: "26px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
  } as const;

  const inputStyle = {
    width: "100%",
    padding: modoTV ? "16px" : "12px",
    borderRadius: "14px",
    border: "1px solid #374151",
    background: "#0f172a",
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

  const cardMoneyStyle = {
    background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(34,197,94,0.12))",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "16px",
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 25%), radial-gradient(circle at top right, rgba(234,179,8,0.18), transparent 20%), radial-gradient(circle at bottom right, rgba(34,197,94,0.16), transparent 22%), linear-gradient(135deg, #020617, #0f172a, #111827)",
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
            0% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.95; }
            25% { transform: translate(26px, -18px) rotate(90deg); opacity: 1; }
            50% { transform: translate(0px, -34px) rotate(180deg); opacity: 0.9; }
            75% { transform: translate(-26px, -16px) rotate(270deg); opacity: 1; }
            100% { transform: translate(0px, 0px) rotate(360deg); opacity: 0.95; }
          }
          @keyframes glowPulse {
            0% { box-shadow: 0 0 0px rgba(255,255,255,0.15); }
            50% { box-shadow: 0 0 30px rgba(255,255,255,0.18); }
            100% { box-shadow: 0 0 0px rgba(255,255,255,0.15); }
          }
          @keyframes floatBeer {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: modoTV ? "26px" : "18px",
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
          position: "absolute",
          bottom: modoTV ? "20px" : "10px",
          left: modoTV ? "26px" : "14px",
          fontSize: modoTV ? "64px" : "40px",
          opacity: 0.2,
          animation: "floatBeer 5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        🍺
      </div>

      {mostrarGanadorTV && ganadores.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(245,158,11,0.18), transparent 20%), linear-gradient(135deg, #020617, #0f172a, #111827)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: "110px", marginBottom: "18px" }}>🏆</div>
          <div style={{ fontSize: "58px", fontWeight: "bold", marginBottom: "10px" }}>
            GANADOR
          </div>
          <div style={{ fontSize: "72px", fontWeight: "bold", marginBottom: "16px" }}>
            {ganadores[0].nombre}
          </div>
          <div style={{ fontSize: "34px", color: "#cbd5e1", marginBottom: "12px" }}>
            Pronóstico: {ganadores[0].goles_local} - {ganadores[0].goles_visitante}
          </div>
          <div style={{ fontSize: "42px", color: "#22c55e", fontWeight: "bold", marginBottom: "28px" }}>
            Premio estimado: {montoPremio}€
          </div>
          <button
            onClick={() => setMostrarGanadorTV(false)}
            style={{
              padding: "16px 28px",
              borderRadius: "14px",
              border: "1px solid #4b5563",
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Cerrar pantalla de ganador
          </button>
        </div>
      )}

      <div
        style={{
          maxWidth: modoTV ? "1600px" : "1380px",
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
              Premio anunciado
            </label>
            <input value={premioTexto} onChange={(e) => setPremioTexto(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Fecha y hora
            </label>
            <input value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} style={inputStyle} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Precio entrada €
              </label>
              <input value={precioEntrada} onChange={(e) => setPrecioEntrada(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                % premio
              </label>
              <input value={porcentajePremio} onChange={(e) => setPorcentajePremio(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                % bar
              </label>
              <input value={porcentajeBar} onChange={(e) => setPorcentajeBar(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ ...cardMoneyStyle, marginBottom: "18px" }}>
            <div style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "10px" }}>
              Dinámica económica mostrada en pantalla
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              <div>💵 Participación: <strong>{precio}€</strong></div>
              <div>👥 Jugadores: <strong>{totalJugadores}</strong></div>
              <div>💰 Bote total: <strong>{boteTotal}€</strong></div>
              <div>🏆 Premio estimado: <strong>{montoPremio}€</strong></div>
              <div>🍻 Bar: <strong>{montoBar}€</strong></div>
              <div>💻 Sistema: <strong>{montoSistema}€</strong></div>
            </div>
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
            Premio: {premioTexto}
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
            disabled={apuestasCerradas}
            style={{
              ...fullButtonStyle,
              background: apuestasCerradas ? "#374151" : "#f8fafc",
              color: apuestasCerradas ? "#d1d5db" : "#111827",
              border: "none",
              marginBottom: "12px",
              animation: apuestasCerradas ? "none" : "glowPulse 3s ease-in-out infinite",
              cursor: apuestasCerradas ? "not-allowed" : "pointer",
            }}
          >
            {apuestasCerradas ? "Apuestas cerradas" : "Enviar pronóstico"}
          </button>

          <div style={{ display: "grid", gap: "10px" }}>
            <button
              onClick={() => setApuestasCerradas(!apuestasCerradas)}
              style={fullButtonStyle}
            >
              {apuestasCerradas ? "Abrir apuestas" : "Cerrar apuestas"}
            </button>

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
              <li>El cobro de participación se realiza fuera de la app.</li>
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

              <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
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

              <button
                onClick={() => setMostrarGanadorTV(true)}
                style={{
                  ...fullButtonStyle,
                  background: "#f8fafc",
                  color: "#111827",
                  border: "none",
                }}
              >
                Mostrar ganador en TV
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}