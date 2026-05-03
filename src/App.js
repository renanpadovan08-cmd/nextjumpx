// =============================
// ARQUIVO: src/App.js
// =============================

import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

export default function App() {
  const [logged, setLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", service: "Corte", time: "" });

  const services = [
    { name: "Corte", price: "R$ 40", duration: "45 min" },
    { name: "Barba", price: "R$ 30", duration: "30 min" },
    { name: "Corte + Barba", price: "R$ 65", duration: "1h" },
    { name: "Combo Premium", price: "R$ 95", duration: "1h30" },
  ];

  const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLogged(true);
        setCurrentUser(user);
        loadAppointments(user.uid);
      } else {
        setLogged(false);
        setCurrentUser(null);
        setAppointments([]);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loginUser() {
    if (!email || !password) {
      alert("Preencha email e senha");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Erro ao entrar: " + traduzirErroFirebase(error.code));
    } finally {
      setLoading(false);
    }
  }

  async function registerUser() {
    if (!email || !password) {
      alert("Preencha email e senha");
      return;
    }

    if (password.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Conta criada com sucesso!");
    } catch (error) {
      alert("Erro ao cadastrar: " + traduzirErroFirebase(error.code));
    } finally {
      setLoading(false);
    }
  }

  async function logoutUser() {
    await signOut(auth);
    setEmail("");
    setPassword("");
  }

  async function loadAppointments(uidParam) {
    const uid = uidParam || currentUser?.uid;
    if (!uid) return;

    try {
      const appointmentsRef = collection(db, "appointments");
      const q = query(
        appointmentsRef,
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const list = [];

      querySnapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() });
      });

      setAppointments(list);
    } catch (error) {
      alert("Erro ao carregar agendamentos: " + error.message);
    }
  }

  async function createAppointment() {
    if (!form.name || !form.time) {
      alert("Preencha nome e horário");
      return;
    }

    if (!currentUser) {
      alert("Você precisa estar logado");
      return;
    }

    try {
      const newAppointment = {
        name: form.name,
        phone: form.phone,
        service: form.service,
        time: form.time,
        status: "Pendente",
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        createdAt: Date.now(),
      };

      await addDoc(collection(db, "appointments"), newAppointment);
      setForm({ name: "", phone: "", service: "Corte", time: "" });
      await loadAppointments(currentUser.uid);
      alert("Agendamento salvo no banco com sucesso!");
      setPage("dashboard");
    } catch (error) {
      alert("Erro ao salvar agendamento: " + error.message);
    }
  }

  async function removeAppointment(id) {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir este agendamento?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "appointments", id));
      await loadAppointments();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }

  async function confirmAppointment(id) {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "Confirmado",
      });
      await loadAppointments();
    } catch (error) {
      alert("Erro ao confirmar: " + error.message);
    }
  }

  if (!logged) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlow}></div>
        <div style={styles.loginBox}>
          <div style={styles.logo}>✂</div>
          <h1 style={styles.loginTitle}>NextJumpx</h1>
          <p style={styles.subtitle}>Automação premium para barbearias</p>

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.primaryButton} onClick={loginUser} disabled={loading}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>

          <button style={styles.secondaryButton} onClick={registerUser} disabled={loading}>
            Criar conta
          </button>

          <p style={styles.smallText}>Login real conectado ao Firebase</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>✂</div>
          <div>
            <h2 style={{ margin: 0 }}>NextJumpx</h2>
            <p style={styles.smallText}>{currentUser?.email}</p>
          </div>
        </div>

        <MenuButton active={page === "dashboard"} onClick={() => setPage("dashboard")} text="Dashboard" />
        <MenuButton active={page === "agenda"} onClick={() => setPage("agenda")} text="Agenda" />
        <MenuButton active={page === "services"} onClick={() => setPage("services")} text="Serviços" />
        <MenuButton active={page === "agendar"} onClick={() => setPage("agendar")} text="Link de Agendamento" />
        <MenuButton active={page === "admin"} onClick={() => setPage("admin")} text="Admin Master" />

        <button style={styles.logout} onClick={logoutUser}>Sair</button>
      </aside>

      <main style={styles.main}>
        {page === "dashboard" && (
          <>
            <Header title="Dashboard NextJumpx" text="Controle sua barbearia em um painel premium." />

            <div style={styles.cardsGrid}>
              <Card title="Clientes" value="120" detail="demo" />
              <Card title="Agendamentos" value={appointments.length} detail="salvos no banco" />
              <Card title="Faturamento" value="R$ 2.300" detail="estimado" />
              <Card title="Confirmações" value="92%" detail="presença" />
            </div>

            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Agenda de hoje</h2>
                  <p style={styles.muted}>Próximos horários salvos no Firebase.</p>
                </div>
                <button style={styles.primarySmall} onClick={() => setPage("agendar")}>+ Novo</button>
              </div>

              {appointments.length === 0 && (
                <p style={styles.emptyText}>Nenhum agendamento ainda. Clique em “+ Novo”.</p>
              )}

              {appointments.map((item) => (
                <Appointment
                  key={item.id}
                  item={item}
                  onConfirm={() => confirmAppointment(item.id)}
                  onDelete={() => removeAppointment(item.id)}
                />
              ))}
            </div>
          </>
        )}

        {page === "agenda" && (
          <>
            <Header title="Agenda" text="Horários disponíveis e agendamentos do dia." />
            <div style={styles.timesGrid}>
              {times.map((time) => {
                const busy = appointments.find((a) => a.time === time);
                return (
                  <div key={time} style={busy ? styles.timeBusy : styles.timeFree}>
                    <strong>{time}</strong>
                    <p>{busy ? busy.name : "Livre"}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {page === "services" && (
          <>
            <Header title="Serviços" text="Tabela de serviços da barbearia." />
            <div style={styles.servicesGrid}>
              {services.map((s) => (
                <div key={s.name} style={styles.serviceCard}>
                  <div style={styles.serviceIcon}>✂</div>
                  <h3>{s.name}</h3>
                  <p style={styles.muted}>{s.duration}</p>
                  <h2 style={styles.neonText}>{s.price}</h2>
                </div>
              ))}
            </div>
          </>
        )}

        {page === "agendar" && (
          <>
            <Header title="Página de Agendamento" text="Simulação do link que o cliente do barbeiro vai acessar." />

            <div style={styles.bookingBox}>
              <h2 style={styles.sectionTitle}>Agendar horário</h2>
              <p style={styles.muted}>Barbearia Império - escolha serviço e horário.</p>

              <input
                style={styles.inputDark}
                placeholder="Nome do cliente"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                style={styles.inputDark}
                placeholder="WhatsApp"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              <select
                style={styles.inputDark}
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              >
                {services.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>

              <div style={styles.timesGridSmall}>
                {times.map((time) => {
                  const busy = appointments.find((a) => a.time === time);
                  return (
                    <button
                      key={time}
                      disabled={!!busy}
                      style={
                        busy
                          ? styles.disabledTime
                          : form.time === time
                          ? styles.selectedTime
                          : styles.timeButton
                      }
                      onClick={() => setForm({ ...form, time })}
                    >
                      {busy ? `${time} ocupado` : time}
                    </button>
                  );
                })}
              </div>

              <button style={styles.primaryButton} onClick={createAppointment}>
                Confirmar agendamento
              </button>
            </div>
          </>
        )}

        {page === "admin" && (
          <>
            <Header title="Admin Master" text="Seu controle majoritário de clientes, planos e acessos." />

            <div style={styles.cardsGrid}>
              <Card title="Clientes SaaS" value="36" detail="demo" />
              <Card title="MRR" value="R$ 6.392" detail="demo" />
              <Card title="Ativos" value="32" detail="demo" />
              <Card title="Bloqueados" value="4" detail="demo" />
            </div>

            <div style={styles.panel}>
              <h2 style={styles.sectionTitle}>Clientes do sistema</h2>
              <AdminRow name="Barbearia Império" owner="Rafael" plan="Pro" status="Ativo" />
              <AdminRow name="Studio Navalha" owner="Bruno" plan="Básico" status="Ativo" />
              <AdminRow name="King Barber" owner="Diego" plan="Premium" status="Bloqueado" />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function traduzirErroFirebase(code) {
  const errors = {
    "auth/email-already-in-use": "este email já está cadastrado.",
    "auth/invalid-email": "email inválido.",
    "auth/weak-password": "senha fraca. Use pelo menos 6 caracteres.",
    "auth/user-not-found": "usuário não encontrado.",
    "auth/wrong-password": "senha incorreta.",
    "auth/invalid-credential": "email ou senha incorretos.",
  };

  return errors[code] || code;
}

function Header({ title, text }) {
  return (
    <div style={styles.header}>
      <div>
        <p style={styles.neonText}>Sistema SaaS</p>
        <h1 style={styles.pageTitle}>{title}</h1>
        <p style={styles.muted}>{text}</p>
      </div>
    </div>
  );
}

function MenuButton({ active, onClick, text }) {
  return (
    <button onClick={onClick} style={active ? styles.menuActive : styles.menuButton}>
      {text}
    </button>
  );
}

function Card({ title, value, detail }) {
  return (
    <div style={styles.card}>
      <p style={styles.muted}>{title}</p>
      <h2 style={styles.cardValue}>{value}</h2>
      <p style={styles.neonText}>{detail}</p>
    </div>
  );
}

function Appointment({ item, onConfirm, onDelete }) {
  return (
    <div style={styles.appointment}>
      <div>
        <strong style={styles.timeBadge}>{item.time}</strong>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0 }}>{item.name}</h3>
        <p style={styles.muted}>{item.service} {item.phone ? `• ${item.phone}` : ""}</p>
      </div>
      <span style={item.status === "Confirmado" ? styles.statusOk : styles.statusPending}>
        {item.status}
      </span>
      <button style={styles.confirmBtn} onClick={onConfirm}>Confirmar</button>
      <button style={styles.deleteBtn} onClick={onDelete}>Excluir</button>
    </div>
  );
}

function AdminRow({ name, owner, plan, status }) {
  return (
    <div style={styles.adminRow}>
      <div>
        <strong>{name}</strong>
        <p style={styles.muted}>Dono: {owner}</p>
      </div>
      <span>Plano {plan}</span>
      <span style={status === "Ativo" ? styles.statusOk : styles.statusBlocked}>{status}</span>
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top left, #064e3b 0%, #0a0a0a 35%, #050505 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontFamily: "Arial",
  },
  loginGlow: {
    position: "fixed",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "#00ff88",
    filter: "blur(140px)",
    opacity: 0.2,
  },
  loginBox: {
    width: 360,
    background: "rgba(10,10,10,0.88)",
    border: "1px solid rgba(0,255,136,0.25)",
    borderRadius: 30,
    padding: 30,
    zIndex: 1,
    boxShadow: "0 0 40px rgba(0,255,136,0.12)",
    textAlign: "center",
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 24,
    background: "#00ff88",
    color: "#050505",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
    margin: "0 auto 20px",
    fontWeight: "bold",
  },
  loginTitle: { fontSize: 38, margin: 0 },
  subtitle: { color: "#aaa", marginBottom: 25 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 15,
    marginBottom: 12,
    borderRadius: 16,
    border: "1px solid #222",
    background: "#111",
    color: "white",
    outline: "none",
  },
  inputDark: {
    width: "100%",
    boxSizing: "border-box",
    padding: 15,
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid #222",
    background: "#090909",
    color: "white",
    outline: "none",
  },
  primaryButton: {
    width: "100%",
    padding: 15,
    borderRadius: 16,
    border: "none",
    background: "#00ff88",
    color: "#050505",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 12,
  },
  secondaryButton: {
    width: "100%",
    padding: 15,
    borderRadius: 16,
    border: "1px solid rgba(0,255,136,0.35)",
    background: "transparent",
    color: "#00ff88",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 12,
  },
  smallText: { color: "#777", fontSize: 12, wordBreak: "break-word" },
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#050505",
    color: "white",
    fontFamily: "Arial",
  },
  sidebar: {
    width: 260,
    background: "#080808",
    borderRight: "1px solid rgba(0,255,136,0.15)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 35 },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    background: "#00ff88",
    color: "#050505",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 25,
  },
  menuButton: {
    padding: 14,
    borderRadius: 16,
    border: "none",
    background: "transparent",
    color: "#aaa",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: "bold",
  },
  menuActive: {
    padding: 14,
    borderRadius: 16,
    border: "none",
    background: "#00ff88",
    color: "#050505",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logout: {
    marginTop: "auto",
    padding: 14,
    borderRadius: 16,
    border: "1px solid #222",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    padding: 30,
    background: "radial-gradient(circle at top right, rgba(0,255,136,0.08), transparent 30%), #050505",
  },
  header: { marginBottom: 25 },
  pageTitle: { fontSize: 42, margin: "4px 0" },
  neonText: { color: "#00ff88", fontWeight: "bold" },
  muted: { color: "#aaa", margin: "4px 0" },
  emptyText: { color: "#aaa", marginTop: 18, padding: 18, background: "#090909", borderRadius: 16 },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "rgba(17,17,17,0.9)",
    border: "1px solid rgba(0,255,136,0.14)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 15px 35px rgba(0,0,0,0.28)",
  },
  cardValue: { fontSize: 32, margin: "8px 0" },
  panel: {
    background: "rgba(17,17,17,0.9)",
    border: "1px solid rgba(0,255,136,0.14)",
    borderRadius: 26,
    padding: 22,
  },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { margin: 0, fontSize: 26 },
  primarySmall: {
    padding: "12px 18px",
    background: "#00ff88",
    color: "#050505",
    border: "none",
    borderRadius: 14,
    fontWeight: "bold",
    cursor: "pointer",
  },
  appointment: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#090909",
    border: "1px solid #1f1f1f",
    borderRadius: 18,
    padding: 15,
    marginTop: 12,
  },
  timeBadge: {
    background: "#050505",
    border: "1px solid rgba(0,255,136,0.28)",
    color: "#00ff88",
    padding: "12px 14px",
    borderRadius: 14,
    display: "inline-block",
  },
  statusOk: {
    color: "#00ff88",
    background: "rgba(0,255,136,0.08)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
  },
  statusPending: {
    color: "#ffd166",
    background: "rgba(255,209,102,0.08)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
  },
  statusBlocked: {
    color: "#ff5c5c",
    background: "rgba(255,92,92,0.08)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
  },
  confirmBtn: {
    background: "rgba(0,255,136,0.12)",
    color: "#00ff88",
    border: "1px solid rgba(0,255,136,0.25)",
    borderRadius: 12,
    padding: 10,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "rgba(255,92,92,0.10)",
    color: "#ff5c5c",
    border: "1px solid rgba(255,92,92,0.25)",
    borderRadius: 12,
    padding: 10,
    cursor: "pointer",
  },
  timesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 14,
  },
  timeFree: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 18,
    padding: 20,
  },
  timeBusy: {
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.25)",
    borderRadius: 18,
    padding: 20,
    color: "#00ff88",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  serviceCard: {
    background: "#111",
    border: "1px solid rgba(0,255,136,0.15)",
    borderRadius: 24,
    padding: 24,
  },
  serviceIcon: { fontSize: 32, color: "#00ff88" },
  bookingBox: {
    maxWidth: 560,
    background: "rgba(17,17,17,0.92)",
    border: "1px solid rgba(0,255,136,0.15)",
    borderRadius: 28,
    padding: 24,
  },
  timesGridSmall: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginTop: 14,
  },
  timeButton: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #222",
    background: "#090909",
    color: "white",
    cursor: "pointer",
  },
  selectedTime: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #00ff88",
    background: "#00ff88",
    color: "#050505",
    cursor: "pointer",
    fontWeight: "bold",
  },
  disabledTime: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #333",
    background: "#151515",
    color: "#666",
    cursor: "not-allowed",
  },
  adminRow: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 120px",
    gap: 14,
    alignItems: "center",
    background: "#090909",
    border: "1px solid #1f1f1f",
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },
};


// =============================
// ARQUIVO: src/firebase.js
// =============================

// Crie este arquivo separadamente em src/firebase.js e cole apenas o conteúdo abaixo:

/*
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADg5nYfj49vG2y08zFBaUNHoxatpXuiJ8",
  authDomain: "nextjumpx.firebaseapp.com",
  projectId: "nextjumpx",
  storageBucket: "nextjumpx.firebasestorage.app",
  messagingSenderId: "244868405828",
  appId: "1:244868405828:web:e2d5d05d2d477494e83a11",
  measurementId: "G-CL6WQGKRRC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
*/


// =============================
// ARQUIVO: vercel.json
// =============================

// Crie este arquivo na raiz do projeto e cole apenas o conteúdo abaixo:

/*
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
*/
