// ─────────────────────────────────────────────
//  Auth Module — Async (server-backed users)
// ─────────────────────────────────────────────
const Auth = (() => {
  let _currentUser = null;

  async function init() {
    const session = DB.getSession();
    if (session && session.phone) {
      _currentUser = await DB.getUser(session.phone);
    }
    return _currentUser;
  }

  function isLoggedIn() { return !!_currentUser; }
  function getCurrentUser() { return _currentUser; }

  async function login(phone) {
    const user = await DB.getUser(phone);
    if (!user || !user.phone) return { success: false, reason: 'not_found' };
    _currentUser = user;
    DB.setSession(phone);
    return { success: true, user, isNew: false };
  }

  async function register(phone, name) {
    const exists = await DB.userExists(phone);
    if (exists) {
      // User exists — log them in instead
      return await login(phone);
    }
    const user = await DB.saveUser({
      phone,
      name: name.trim(),
      joinedAt: new Date().toISOString(),
    });
    if (!user || user.error) return { success: false, reason: 'save_failed' };
    _currentUser = user;
    DB.setSession(phone);
    return { success: true, user, isNew: true };
  }

  async function checkPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) return { valid: false, msg: 'Enter a 10-digit number' };
    const exists = await DB.userExists(clean);
    return { valid: true, exists, phone: clean };
  }

  function isAdmin() {
    // Admin is identified by a flag set during admin login, or a known admin phone
    return false;
  }

  function logout() {
    _currentUser = null;
    DB.clearSession();
  }

  return { init, isLoggedIn, isAdmin, getCurrentUser, login, register, checkPhone, logout };
})();
