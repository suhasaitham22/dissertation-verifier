// Dissertation Verifier - frontend auth (Phase 1)
const SUPABASE_URL = "https://uklhqmvkuataddjkjzms.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbGhxbXZrdWF0YWRkamtqem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NTg4ODgsImV4cCI6MjEwNjUzNDg4OH0.LZueWxUwt_kTZem1itJfbwcMVJMb_D4tuePaO-kROlY";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const emailEl = document.getElementById("auth-email");
const passEl = document.getElementById("auth-password");
const statusEl = document.getElementById("auth-status");
const loggedOutView = document.getElementById("auth-logged-out");
const loggedInView = document.getElementById("auth-logged-in");
const userEmailEl = document.getElementById("auth-user-email");
async function refreshAuthUI() {
  const { data: { session } } = await client.auth.getSession();
  if (session && session.user) {
    loggedOutView.style.display = "none";
    loggedInView.style.display = "block";
    userEmailEl.textContent = session.user.email;
    statusEl.textContent = "";
  } else {
    loggedOutView.style.display = "block";
    loggedInView.style.display = "none";
    userEmailEl.textContent = "";
  }
}
document.getElementById("btn-signup").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) { statusEl.textContent = "Enter an email and password first."; return; }
  statusEl.textContent = "Creating account…"; statusEl.style.color = "#333";
  const { error } = await client.auth.signUp({ email, password });
  if (error) { statusEl.style.color = "#b00"; statusEl.textContent = "Error: " + error.message; }
  else { statusEl.style.color = "#0a0"; statusEl.textContent = "Account created — you are signed in."; }
  refreshAuthUI();
});
document.getElementById("btn-login").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) { statusEl.textContent = "Enter an email and password first."; return; }
  statusEl.textContent = "Signing in…"; statusEl.style.color = "#333";
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) { statusEl.style.color = "#b00"; statusEl.textContent = "Error: " + error.message; }
  else { statusEl.textContent = ""; }
  refreshAuthUI();
});
document.getElementById("btn-logout").addEventListener("click", async () => {
  await client.auth.signOut();
  emailEl.value = ""; passEl.value = "";
  refreshAuthUI();
});
client.auth.onAuthStateChange(() => refreshAuthUI());
refreshAuthUI();
