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
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const DEFAULT_SERVICES = [
  { name: "Corte", price: 40, duration: "45 min" },
  { name: "Barba", price: 30, duration: "30 min" },
  { name: "Corte + Barba", price: 65, duration: "1h" },
  { name: "Combo Premium", price: 95, duration: "1h30" },
];

const DEFAULT_TIMES = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DEFAULT_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function App() {
  const [logged, setLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  const [form, setForm] = useState({ name: "", phone: "", service: "Corte", time: "", day: "Hoje" });
  const [profile, setProfile] = useState({
    barberName: "Minha Barbearia",
    barberSlug: "",
    barberWhatsapp: "",
    barberPhoto: "",
    barberAddress: "",
    barberInstagram: "",
    primaryColor: "#00ff88",
    monthlyPrice: 59,
    workingDays: DEFAULT_DAYS,
    workingHours: DEFAULT_TIMES,
    services: DEFAULT_SERVICES,
  });

  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "" });
  const [newHour, setNewHour] = useState("");

  const [publicSlug, setPublicSlug] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null);
  const [publicAppointments, setPublicAppointments] = useState([]);
  const [publicForm, setPublicForm] = useState({ name: "", phone: "", service: "Corte", time: "", day: "Hoje" });

  useEffect(() => {
    const path = window.location.pathname;
    const slugFromUrl = path.replace("/", "").trim();
    const reserved = ["", "login", "admin", "dashboard"];

    if (slugFromUrl && !reserved.includes(slugFromUrl)) {
      setPublicSlug(slugFromUrl);
      loadPublicPage(slugFromUrl);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLogged(false);
        setCurrentUser(null);
        setUserData(null);
        setRole("client");
        setAppointments([]);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          const data = createDefaultUserData(user);
          await setDoc(userRef, data);
        }

        const updated = await getDoc(userRef);
        const data = updated.data();

        setCurrentUser(user);
        setUserData({ id: user.uid, ...data });
        setRole(data.role || "client");
        setLogged(true);

        setProfile({
          barberName: data.barberName || "Minha Barbearia",
          barberSlug: data.barberSlug || gerarSlug(data.email || user.uid),
          barberWhatsapp: data.barberWhatsapp || "",
          barberPhoto: data.barberPhoto || "",
          barberAddress: data.barberAddress || "",
          barberInstagram: data.barberInstagram || "",
          primaryColor: data.primaryColor || "#00ff88",
          monthlyPrice: data.monthlyPrice || 59,
          workingDays: data.workingDays || DEFAULT_DAYS,
          workingHours: data.workingHours || DEFAULT_TIMES,
          services: data.services || DEFAULT_SERVICES,
        });

        await loadAppointments(user.uid);

        if ((data.role || "client") === "admin") {
          await loadAdminData();
        }
      } catch (error) {
        alert("Erro ao carregar conta: " + error.message);
      }
    });

    return () => unsubscribe();
  }, []);

  function createDefaultUserData(user) {
    return {
      uid: user.uid,
      email: user.email,
      active: true,
      role: "client",
      plan: "Teste",
      monthlyPrice: 59,
      barberName: "Minha Barbearia",
      barberSlug: gerarSlug(user.email?.split("@")[0] || user.uid),
      barberWhatsapp: "",
      barberPhoto: "",
      barberAddress: "",
      barberInstagram: "",
      primaryColor: "#00ff88",
      workingDays: DEFAULT_DAYS,
      workingHours: DEFAULT_TIMES,
      services: DEFAULT_SERVICES,
      createdAt: Date.now(),
    };
  }

  async function loginUser() {
    if (!email || !password) return alert("Preencha email e senha");
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
    if (!email || !password) return alert("Preencha email e senha");
    if (password.length < 6) return alert("A senha precisa ter pelo menos 6 caracteres");

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), createDefaultUserData(cred.user));
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

  async function loadAppointments(uid) {
    const q = query(collection(db, "appointments"), where("ownerId", "==", uid));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setAppointments(list);
  }

  async function loadAdminData() {
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setAllUsers(users);

    const appSnap = await getDocs(collection(db, "appointments"));
    const apps = appSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setAllAppointments(apps);
  }

  async function toggleUserActive(user) {
    await updateDoc(doc(db, "users", user.id), { active: !user.active });
    await loadAdminData();
  }

  async function updateUserPlan(user, plan) {
    await updateDoc(doc(db, "users", user.id), { plan });
    await loadAdminData();
  }

  async function updateUserMonthlyPrice(user, value) {
    const price = Number(value) || 0;
    await updateDoc(doc(db, "users", user.id), { monthlyPrice: price });
    await loadAdminData();
  }

  async function createAppointment() {
    if (!form.name || !form.time) return alert("Preencha nome e horário");
    if (!currentUser) return alert("Você precisa estar logado");

    const appointment = {
      name: form.name,
      phone: form.phone,
      service: form.service,
      time: form.time,
      day: form.day || "Hoje",
      status: "Pendente",
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email,
      createdAt: Date.now(),
    };

    await addDoc(collection(db, "appointments"), appointment);
    setForm({ name: "", phone: "", service: profile.services?.[0]?.name || "Corte", time: "", day: "Hoje" });
    await loadAppointments(currentUser.uid);
    alert("Agendamento salvo!");
    setPage("dashboard");
  }

  async function removeAppointment(id) {
    if (!window.confirm("Excluir este agendamento?")) return;
    await deleteDoc(doc(db, "appointments", id));
    await loadAppointments(currentUser.uid);
  }

  async function confirmAppointment(id) {
    await updateDoc(doc(db, "appointments", id), { status: "Confirmado" });
    await loadAppointments(currentUser.uid);
  }

  async function saveProfile() {
    if (!currentUser) return;
    const cleanSlug = gerarSlug(profile.barberSlug || profile.barberName);
    if (!cleanSlug) return alert("Defina um link válido.");

    const slugQuery = query(collection(db, "users"), where("barberSlug", "==", cleanSlug));
    const snap = await getDocs(slugQuery);
    const inUse = snap.docs.some((d) => d.id !== currentUser.uid);
    if (inUse) return alert("Esse link já está em uso. Escolha outro.");

    const newProfile = {
      barberName: profile.barberName,
      barberSlug: cleanSlug,
      barberWhatsapp: profile.barberWhatsapp,
      barberPhoto: profile.barberPhoto,
      barberAddress: profile.barberAddress,
      barberInstagram: profile.barberInstagram,
      primaryColor: profile.primaryColor || "#00ff88",
      monthlyPrice: Number(profile.monthlyPrice) || 59,
      workingDays: profile.workingDays || DEFAULT_DAYS,
      workingHours: profile.workingHours || DEFAULT_TIMES,
      services: profile.services || DEFAULT_SERVICES,
    };

    await updateDoc(doc(db, "users", currentUser.uid), newProfile);
    setProfile({ ...profile, barberSlug: cleanSlug });
    alert("Perfil salvo com sucesso!");
  }

  async function loadPublicPage(slug) {
    try {
      const q = query(collection(db, "users"), where("barberSlug", "==", slug));
      const snap = await getDocs(q);
      if (snap.empty) {
        setPublicProfile(null);
        return;
      }

      const userDoc = snap.docs[0];
      const data = userDoc.data();

      if (data.active === false) {
        setPublicProfile({ blocked: true, barberName: data.barberName || "Barbearia" });
        return;
      }

      setPublicProfile({ id: userDoc.id, ...data });
      await loadPublicAppointments(userDoc.id);
    } catch (error) {
      alert("Erro ao carregar página pública: " + error.message);
    }
  }

  async function loadPublicAppointments(ownerId) {
    const q = query(collection(db, "appointments"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPublicAppointments(list);
  }

  async function createPublicAppointment() {
    if (!publicForm.name || !publicForm.time || !publicProfile?.id) return alert("Preencha nome e horário");

    const appointment = {
      name: publicForm.name,
      phone: publicForm.phone,
      service: publicForm.service,
      time: publicForm.time,
      day: publicForm.day || "Hoje",
      status: "Pendente",
      ownerId: publicProfile.id,
      ownerEmail: publicProfile.email,
      createdAt: Date.now(),
    };

    await addDoc(collection(db, "appointments"), appointment);
    await loadPublicAppointments(publicProfile.id);

    const msg = `Novo agendamento NextJumpx:%0A%0ACliente: ${publicForm.name}%0AWhatsApp: ${publicForm.phone || "não informado"}%0AServiço: ${publicForm.service}%0ADia: ${publicForm.day || "Hoje"}%0AHorário: ${publicForm.time}`;
    const number = limparTelefone(publicProfile.barberWhatsapp || "");

    setPublicForm({ name: "", phone: "", service: publicProfile.services?.[0]?.name || "Corte", time: "", day: "Hoje" });

    if (number) window.open(`https://wa.me/55${number}?text=${msg}`, "_blank");
    alert("Agendamento enviado com sucesso!");
  }

  function addService() {
    if (!serviceForm.name || !serviceForm.price) return alert("Preencha nome e preço do serviço");
    const service = { name: serviceForm.name, price: Number(serviceForm.price) || 0, duration: serviceForm.duration || "" };
    setProfile({ ...profile, services: [...(profile.services || []), service] });
    setServiceForm({ name: "", price: "", duration: "" });
  }

  function removeService(index) {
    const list = [...(profile.services || [])];
    list.splice(index, 1);
    setProfile({ ...profile, services: list });
  }

  function addHour() {
    if (!newHour) return;
    if ((profile.workingHours || []).includes(newHour)) return alert("Esse horário já existe");
    const list = [...(profile.workingHours || []), newHour].sort();
    setProfile({ ...profile, workingHours: list });
    setNewHour("");
  }

  function removeHour(hour) {
    setProfile({ ...profile, workingHours: (profile.workingHours || []).filter((h) => h !== hour) });
  }

  function toggleDay(day) {
    const days = profile.workingDays || [];
    if (days.includes(day)) setProfile({ ...profile, workingDays: days.filter((d) => d !== day) });
    else setProfile({ ...profile, workingDays: [...days, day] });
  }

  function copyPublicLink() {
    const link = `${window.location.origin}/${profile.barberSlug || "seu-link"}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado: " + link);
  }

  function openWhatsAppClient(item) {
    const phone = limparTelefone(item.phone || "");
    if (!phone) return alert("Cliente sem WhatsApp cadastrado.");
    const msg = `Olá ${item.name}, seu horário foi confirmado:%0A%0AServiço: ${item.service}%0ADia: ${item.day || "Hoje"}%0AHorário: ${item.time}%0A%0AAté lá! ✂️`;
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  }

  if (publicSlug) {
    return <PublicPage profile={publicProfile} form={publicForm} setForm={setPublicForm} appointments={publicAppointments} onSubmit={createPublicAppointment} />;
  }

  if (!logged) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlow}></div>
        <div style={styles.loginBox}>
          <div style={styles.logo}>✂</div>
          <h1 style={styles.loginTitle}>NextJumpx</h1>
          <p style={styles.subtitle}>Automação premium para barbearias</p>
          <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.input} type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.primaryButton} onClick={loginUser} disabled={loading}>{loading ? "Entrando..." : "Entrar no sistema"}</button>
          <button style={styles.secondaryButton} onClick={registerUser} disabled={loading}>Criar conta</button>
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";
  const revenue = allUsers.filter((u) => u.active && u.role !== "admin").reduce((sum, u) => sum + (Number(u.monthlyPrice) || 0), 0);
  const activeClients = allUsers.filter((u) => u.active && u.role !== "admin").length;
  const blockedClients = allUsers.filter((u) => !u.active && u.role !== "admin").length;

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
        <MenuButton active={page === "services"} onClick={() => setPage("services")} text="Serviços e horários" />
        <MenuButton active={page === "agendar"} onClick={() => setPage("agendar")} text="Agendar manual" />
        <MenuButton active={page === "profile"} onClick={() => setPage("profile")} text="Perfil público" />
        {isAdmin && <MenuButton active={page === "admin"} onClick={() => { setPage("admin"); loadAdminData(); }} text="Admin Master" />}
        <button style={styles.logout} onClick={logoutUser}>Sair</button>
      </aside>

      <main style={styles.main}>
        {page === "dashboard" && (
          <>
            <Header title="Painel NextJumpx" text={isAdmin ? "Painel administrativo do dono." : "Controle sua barbearia."} />
            <div style={styles.cardsGrid}>
              <Card title="Agendamentos" value={appointments.length} detail="salvos no banco" />
              <Card title="Plano" value={userData?.plan || "Teste"} detail={userData?.active ? "ativo" : "bloqueado"} />
              <Card title="Link Público" value="Ativo" detail={`/${profile.barberSlug || "seu-link"}`} />
              <Card title="Serviços" value={(profile.services || []).length} detail="configurados" />
            </div>
            <AppointmentPanel appointments={appointments} onConfirm={confirmAppointment} onDelete={removeAppointment} onWhatsapp={openWhatsAppClient} onNew={() => setPage("agendar")} />
          </>
        )}

        {page === "agenda" && (
          <>
            <Header title="Agenda" text="Horários disponíveis e agendamentos." />
            <div style={styles.timesGrid}>{(profile.workingHours || []).map((time) => { const busy = appointments.find((a) => a.time === time); return <div key={time} style={busy ? styles.timeBusy : styles.timeFree}><strong>{time}</strong><p>{busy ? busy.name : "Livre"}</p></div>; })}</div>
          </>
        )}

        {page === "services" && (
          <>
            <Header title="Serviços, dias e horários" text="Cada barbeiro configura sua rotina." />
            <SettingsPanel profile={profile} setProfile={setProfile} serviceForm={serviceForm} setServiceForm={setServiceForm} addService={addService} removeService={removeService} newHour={newHour} setNewHour={setNewHour} addHour={addHour} removeHour={removeHour} toggleDay={toggleDay} saveProfile={saveProfile} />
          </>
        )}

        {page === "agendar" && (
          <>
            <Header title="Agendamento manual" text="Crie um agendamento pelo painel." />
            <BookingForm form={form} setForm={setForm} profile={profile} appointments={appointments} onSubmit={createAppointment} />
          </>
        )}

        {page === "profile" && (
          <>
            <Header title="Perfil Público Profissional" text="Configure o link que seus clientes vão usar." />
            <ProfilePanel profile={profile} setProfile={setProfile} saveProfile={saveProfile} copyPublicLink={copyPublicLink} />
          </>
        )}

        {page === "admin" && isAdmin && (
          <>
            <Header title="Admin Master" text="Somente você vê lucros, assinantes e bloqueios." />
            <div style={styles.cardsGrid}>
              <Card title="Receita mensal" value={`R$ ${revenue}`} detail="manual" />
              <Card title="Clientes ativos" value={activeClients} detail="liberados" />
              <Card title="Bloqueados" value={blockedClients} detail="sem acesso" />
              <Card title="Agendamentos totais" value={allAppointments.length} detail="geral" />
            </div>
            <AdminPanel users={allUsers} toggleUserActive={toggleUserActive} updateUserPlan={updateUserPlan} updateUserMonthlyPrice={updateUserMonthlyPrice} />
          </>
        )}
      </main>
    </div>
  );
}

function PublicPage({ profile, form, setForm, appointments, onSubmit }) {
  if (!profile) return <div style={styles.publicPage}><div style={styles.publicCard}><h1>Carregando...</h1></div></div>;
  if (profile.blocked) return <div style={styles.publicPage}><div style={styles.publicCard}><h1>{profile.barberName}</h1><p>Agenda temporariamente indisponível.</p></div></div>;

  const services = profile.services || DEFAULT_SERVICES;
  const hours = profile.workingHours || DEFAULT_TIMES;
  const days = profile.workingDays || DEFAULT_DAYS;
  const accent = profile.primaryColor || "#00ff88";

  return (
    <div style={{ ...styles.publicPage, background: `radial-gradient(circle at top left, ${hexToRgba(accent, 0.28)} 0%, #0a0a0a 35%, #050505 100%)` }}>
      <div style={styles.publicCard}>
        {profile.barberPhoto ? <img src={profile.barberPhoto} alt="Logo" style={{ ...styles.publicPhoto, borderColor: accent }} /> : <div style={{ ...styles.logo, margin: "0 auto 20px", background: accent }}>✂</div>}
        <h1 style={styles.loginTitle}>{profile.barberName}</h1>
        <p style={styles.subtitle}>Agende seu horário online</p>
        {profile.barberAddress && <p style={styles.muted}>📍 {profile.barberAddress}</p>}
        {profile.barberInstagram && <p style={styles.muted}>📸 {profile.barberInstagram}</p>}

        <input style={styles.input} placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input style={styles.input} placeholder="Seu WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select style={styles.input} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{services.map((s) => <option key={s.name}>{s.name} - R$ {s.price}</option>)}</select>
        <select style={styles.input} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{days.map((d) => <option key={d}>{d}</option>)}</select>
        <div style={styles.timesGridSmall}>{hours.map((time) => { const busy = appointments.find((a) => a.time === time && a.day === form.day); return <button key={time} disabled={!!busy} style={busy ? styles.disabledTime : form.time === time ? { ...styles.selectedTime, background: accent, borderColor: accent } : styles.timeButton} onClick={() => setForm({ ...form, time })}>{busy ? `${time} ocupado` : time}</button>; })}</div>
        <button style={{ ...styles.primaryButton, background: accent }} onClick={onSubmit}>Confirmar agendamento</button>
        <p style={styles.smallText}>Powered by NextJumpx</p>
      </div>
    </div>
  );
}

function AppointmentPanel({ appointments, onConfirm, onDelete, onWhatsapp, onNew }) {
  return <div style={styles.panel}><div style={styles.panelHeader}><div><h2 style={styles.sectionTitle}>Agenda</h2><p style={styles.muted}>Agendamentos recebidos.</p></div><button style={styles.primarySmall} onClick={onNew}>+ Novo</button></div>{appointments.length === 0 && <p style={styles.emptyText}>Nenhum agendamento ainda.</p>}{appointments.map((item) => <Appointment key={item.id} item={item} onConfirm={() => onConfirm(item.id)} onDelete={() => onDelete(item.id)} onWhatsapp={() => onWhatsapp(item)} />)}</div>;
}

function Appointment({ item, onConfirm, onDelete, onWhatsapp }) {
  return <div style={styles.appointment}><div><strong style={styles.timeBadge}>{item.time}</strong></div><div style={{ flex: 1 }}><h3 style={{ margin: 0 }}>{item.name}</h3><p style={styles.muted}>{item.day || "Hoje"} • {item.service} {item.phone ? `• ${item.phone}` : ""}</p></div><span style={item.status === "Confirmado" ? styles.statusOk : styles.statusPending}>{item.status}</span><button style={styles.confirmBtn} onClick={onConfirm}>Confirmar</button><button style={styles.whatsappBtn} onClick={onWhatsapp}>WhatsApp</button><button style={styles.deleteBtn} onClick={onDelete}>Excluir</button></div>;
}

function BookingForm({ form, setForm, profile, appointments, onSubmit }) {
  const services = profile.services || DEFAULT_SERVICES;
  const hours = profile.workingHours || DEFAULT_TIMES;
  const days = profile.workingDays || DEFAULT_DAYS;
  return <div style={styles.bookingBox}><h2 style={styles.sectionTitle}>Agendar horário</h2><input style={styles.inputDark} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input style={styles.inputDark} placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><select style={styles.inputDark} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{services.map((s) => <option key={s.name}>{s.name} - R$ {s.price}</option>)}</select><select style={styles.inputDark} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{days.map((d) => <option key={d}>{d}</option>)}</select><div style={styles.timesGridSmall}>{hours.map((time) => { const busy = appointments.find((a) => a.time === time && a.day === form.day); return <button key={time} disabled={!!busy} style={busy ? styles.disabledTime : form.time === time ? styles.selectedTime : styles.timeButton} onClick={() => setForm({ ...form, time })}>{busy ? `${time} ocupado` : time}</button>; })}</div><button style={styles.primaryButton} onClick={onSubmit}>Confirmar agendamento</button></div>;
}

function SettingsPanel({ profile, setProfile, serviceForm, setServiceForm, addService, removeService, newHour, setNewHour, addHour, removeHour, toggleDay, saveProfile }) {
  return <div style={styles.panel}><h2 style={styles.sectionTitle}>Serviços</h2><div style={styles.row}><input style={styles.inputDark} placeholder="Serviço" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /><input style={styles.inputDark} placeholder="Preço" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} /><input style={styles.inputDark} placeholder="Duração" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} /><button style={styles.primaryButton} onClick={addService}>Adicionar serviço</button></div><div style={styles.servicesGrid}>{(profile.services || []).map((s, i) => <div key={i} style={styles.serviceCard}><h3>{s.name}</h3><p style={styles.muted}>{s.duration}</p><h2 style={styles.neonText}>R$ {s.price}</h2><button style={styles.deleteBtn} onClick={() => removeService(i)}>Remover</button></div>)}</div><h2 style={{ ...styles.sectionTitle, marginTop: 25 }}>Dias de trabalho</h2><div style={styles.chips}>{["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((d) => <button key={d} style={(profile.workingDays || []).includes(d) ? styles.chipActive : styles.chip} onClick={() => toggleDay(d)}>{d}</button>)}</div><h2 style={{ ...styles.sectionTitle, marginTop: 25 }}>Horários</h2><div style={styles.row}><input style={styles.inputDark} placeholder="Ex: 19:30" value={newHour} onChange={(e) => setNewHour(e.target.value)} /><button style={styles.primaryButton} onClick={addHour}>Adicionar horário</button></div><div style={styles.chips}>{(profile.workingHours || []).map((h) => <button key={h} style={styles.chipActive} onClick={() => removeHour(h)}>{h} ×</button>)}</div><button style={styles.primaryButton} onClick={saveProfile}>Salvar serviços e horários</button></div>;
}

function ProfilePanel({ profile, setProfile, saveProfile, copyPublicLink }) {
  return <div style={styles.bookingBox}><h2 style={styles.sectionTitle}>Dados públicos</h2><div style={styles.linkBox}>{window.location.origin}/{profile.barberSlug || "seu-link"}</div><button style={styles.primaryButton} onClick={copyPublicLink}>Copiar link público</button><input style={styles.inputDark} placeholder="Nome da barbearia" value={profile.barberName} onChange={(e) => setProfile({ ...profile, barberName: e.target.value })} /><input style={styles.inputDark} placeholder="Link personalizado" value={profile.barberSlug} onChange={(e) => setProfile({ ...profile, barberSlug: gerarSlug(e.target.value) })} /><input style={styles.inputDark} placeholder="WhatsApp" value={profile.barberWhatsapp} onChange={(e) => setProfile({ ...profile, barberWhatsapp: e.target.value })} /><input style={styles.inputDark} placeholder="Endereço" value={profile.barberAddress} onChange={(e) => setProfile({ ...profile, barberAddress: e.target.value })} /><input style={styles.inputDark} placeholder="Instagram" value={profile.barberInstagram} onChange={(e) => setProfile({ ...profile, barberInstagram: e.target.value })} /><input style={styles.inputDark} placeholder="URL da foto/logo" value={profile.barberPhoto} onChange={(e) => setProfile({ ...profile, barberPhoto: e.target.value })} /><input style={styles.inputDark} placeholder="Cor principal" value={profile.primaryColor} onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })} /><button style={styles.primaryButton} onClick={saveProfile}>Salvar perfil</button></div>;
}

function AdminPanel({ users, toggleUserActive, updateUserPlan, updateUserMonthlyPrice }) {
  return <div style={styles.panel}><h2 style={styles.sectionTitle}>Clientes cadastrados</h2>{users.filter((u) => u.role !== "admin").map((u) => <div key={u.id} style={styles.adminRow}><div><strong>{u.barberName || u.email}</strong><p style={styles.muted}>{u.email}</p></div><select style={styles.adminInput} value={u.plan || "Teste"} onChange={(e) => updateUserPlan(u, e.target.value)}><option>Teste</option><option>Básico</option><option>Pro</option><option>Premium</option></select><input style={styles.adminInput} value={u.monthlyPrice || 0} onChange={(e) => updateUserMonthlyPrice(u, e.target.value)} /><button style={u.active ? styles.confirmBtn : styles.deleteBtn} onClick={() => toggleUserActive(u)}>{u.active ? "Ativo" : "Bloqueado"}</button></div>)}</div>;
}

function Header({ title, text }) { return <div style={styles.header}><p style={styles.neonText}>Sistema SaaS</p><h1 style={styles.pageTitle}>{title}</h1><p style={styles.muted}>{text}</p></div>; }
function MenuButton({ active, onClick, text }) { return <button onClick={onClick} style={active ? styles.menuActive : styles.menuButton}>{text}</button>; }
function Card({ title, value, detail }) { return <div style={styles.card}><p style={styles.muted}>{title}</p><h2 style={styles.cardValue}>{value}</h2><p style={styles.neonText}>{detail}</p></div>; }
function traduzirErroFirebase(code) { const errors = { "auth/email-already-in-use": "este email já está cadastrado.", "auth/invalid-email": "email inválido.", "auth/weak-password": "senha fraca.", "auth/invalid-credential": "email ou senha incorretos." }; return errors[code] || code; }
function limparTelefone(phone) { return String(phone).replace(/\D/g, ""); }
function gerarSlug(text) { return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
function hexToRgba(hex, alpha) { const cleanHex = String(hex || "#00ff88").replace("#", ""); const bigint = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16); return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${alpha})`; }

const styles = {
  loginPage: { minHeight: "100vh", background: "radial-gradient(circle at top left, #064e3b 0%, #0a0a0a 35%, #050505 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "Arial" },
  publicPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "Arial", padding: 20 },
  publicCard: { width: "100%", maxWidth: 520, background: "rgba(10,10,10,0.88)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 30, padding: 30, boxShadow: "0 0 40px rgba(0,255,136,0.12)", textAlign: "center" },
  publicPhoto: { width: 110, height: 110, borderRadius: 28, objectFit: "cover", border: "2px solid #00ff88", marginBottom: 18 },
  loginGlow: { position: "fixed", width: 300, height: 300, borderRadius: "50%", background: "#00ff88", filter: "blur(140px)", opacity: 0.2 },
  loginBox: { width: 360, background: "rgba(10,10,10,0.88)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 30, padding: 30, zIndex: 1, boxShadow: "0 0 40px rgba(0,255,136,0.12)", textAlign: "center" },
  logo: { width: 70, height: 70, borderRadius: 24, background: "#00ff88", color: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, margin: "0 auto 20px", fontWeight: "bold" },
  loginTitle: { fontSize: 38, margin: 0 },
  subtitle: { color: "#aaa", marginBottom: 25 },
  input: { width: "100%", boxSizing: "border-box", padding: 15, marginBottom: 12, borderRadius: 16, border: "1px solid #222", background: "#111", color: "white", outline: "none" },
  inputDark: { width: "100%", boxSizing: "border-box", padding: 15, marginTop: 12, borderRadius: 16, border: "1px solid #222", background: "#090909", color: "white", outline: "none" },
  adminInput: { width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 12, border: "1px solid #222", background: "#090909", color: "white" },
  primaryButton: { width: "100%", padding: 15, borderRadius: 16, border: "none", background: "#00ff88", color: "#050505", fontWeight: "bold", cursor: "pointer", marginTop: 12 },
  secondaryButton: { width: "100%", padding: 15, borderRadius: 16, border: "1px solid rgba(0,255,136,0.35)", background: "transparent", color: "#00ff88", fontWeight: "bold", cursor: "pointer", marginTop: 12 },
  smallText: { color: "#777", fontSize: 12, wordBreak: "break-word" },
  app: { minHeight: "100vh", display: "flex", background: "#050505", color: "white", fontFamily: "Arial" },
  sidebar: { width: 260, background: "#080808", borderRight: "1px solid rgba(0,255,136,0.15)", padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 35 },
  brandIcon: { width: 48, height: 48, borderRadius: 18, background: "#00ff88", color: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25 },
  menuButton: { padding: 14, borderRadius: 16, border: "none", background: "transparent", color: "#aaa", textAlign: "left", cursor: "pointer", fontWeight: "bold" },
  menuActive: { padding: 14, borderRadius: 16, border: "none", background: "#00ff88", color: "#050505", textAlign: "left", cursor: "pointer", fontWeight: "bold" },
  logout: { marginTop: "auto", padding: 14, borderRadius: 16, border: "1px solid #222", background: "#111", color: "white", cursor: "pointer" },
  main: { flex: 1, padding: 30, background: "radial-gradient(circle at top right, rgba(0,255,136,0.08), transparent 30%), #050505" },
  header: { marginBottom: 25 },
  pageTitle: { fontSize: 42, margin: "4px 0" },
  neonText: { color: "#00ff88", fontWeight: "bold" },
  muted: { color: "#aaa", margin: "4px 0" },
  emptyText: { color: "#aaa", marginTop: 18, padding: 18, background: "#090909", borderRadius: 16 },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 24 },
  card: { background: "rgba(17,17,17,0.9)", border: "1px solid rgba(0,255,136,0.14)", borderRadius: 24, padding: 22, boxShadow: "0 15px 35px rgba(0,0,0,0.28)" },
  cardValue: { fontSize: 32, margin: "8px 0" },
  panel: { background: "rgba(17,17,17,0.9)", border: "1px solid rgba(0,255,136,0.14)", borderRadius: 26, padding: 22 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { margin: 0, fontSize: 26 },
  primarySmall: { padding: "12px 18px", background: "#00ff88", color: "#050505", border: "none", borderRadius: 14, fontWeight: "bold", cursor: "pointer" },
  appointment: { display: "flex", alignItems: "center", gap: 14, background: "#090909", border: "1px solid #1f1f1f", borderRadius: 18, padding: 15, marginTop: 12 },
  timeBadge: { background: "#050505", border: "1px solid rgba(0,255,136,0.28)", color: "#00ff88", padding: "12px 14px", borderRadius: 14, display: "inline-block" },
  statusOk: { color: "#00ff88", background: "rgba(0,255,136,0.08)", padding: "8px 12px", borderRadius: 999, fontWeight: "bold", fontSize: 13 },
  statusPending: { color: "#ffd166", background: "rgba(255,209,102,0.08)", padding: "8px 12px", borderRadius: 999, fontWeight: "bold", fontSize: 13 },
  confirmBtn: { background: "rgba(0,255,136,0.12)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 12, padding: 10, cursor: "pointer" },
  whatsappBtn: { background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)", borderRadius: 12, padding: 10, cursor: "pointer" },
  deleteBtn: { background: "rgba(255,92,92,0.10)", color: "#ff5c5c", border: "1px solid rgba(255,92,92,0.25)", borderRadius: 12, padding: 10, cursor: "pointer" },
  timesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 },
  timeFree: { background: "#111", border: "1px solid #222", borderRadius: 18, padding: 20 },
  timeBusy: { background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 18, padding: 20, color: "#00ff88" },
  servicesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 15 },
  serviceCard: { background: "#111", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 24, padding: 24 },
  bookingBox: { maxWidth: 650, background: "rgba(17,17,17,0.92)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 28, padding: 24 },
  timesGridSmall: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 },
  timeButton: { padding: 12, borderRadius: 14, border: "1px solid #222", background: "#090909", color: "white", cursor: "pointer" },
  selectedTime: { padding: 12, borderRadius: 14, border: "1px solid #00ff88", background: "#00ff88", color: "#050505", cursor: "pointer", fontWeight: "bold" },
  disabledTime: { padding: 12, borderRadius: 14, border: "1px solid #333", background: "#151515", color: "#666", cursor: "not-allowed" },
  linkBox: { background: "#090909", color: "#00ff88", border: "1px solid rgba(0,255,136,0.25)", padding: 14, borderRadius: 14, marginTop: 10, wordBreak: "break-all" },
  row: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "end" },
  chips: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 },
  chip: { padding: "10px 12px", borderRadius: 999, border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer" },
  chipActive: { padding: "10px 12px", borderRadius: 999, border: "1px solid #00ff88", background: "rgba(0,255,136,0.12)", color: "#00ff88", cursor: "pointer" },
  adminRow: { display: "grid", gridTemplateColumns: "1.5fr 120px 110px 110px", gap: 12, alignItems: "center", background: "#090909", border: "1px solid #1f1f1f", borderRadius: 18, padding: 16, marginTop: 12 },
};
