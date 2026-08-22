import admin from "./firebaseAdmin";

/**
 * Vérifie le jeton Firebase envoyé par l'admin (header Authorization: Bearer ...)
 * et s'assure que le compte a bien le type "admin".
 */
// La lecture Firestore du rôle coûte ~80 ms et se répète à chaque requête de la
// messagerie (liste, ouverture, marquage lu…). On la met en cache brièvement ;
// la signature du jeton, elle, reste vérifiée à chaque appel.
const ROLE_TTL_MS = 5 * 60 * 1000;
const roleCache = new Map();

async function isAdmin(uid) {
  const cached = roleCache.get(uid);
  if (cached && cached.expires > Date.now()) return cached.admin;

  const snapshot = await admin.firestore().collection("users").doc(uid).get();
  const isAdminUser = snapshot.exists && snapshot.data()?.type === "admin";
  roleCache.set(uid, { admin: isAdminUser, expires: Date.now() + ROLE_TTL_MS });
  return isAdminUser;
}

export async function requireAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return { ok: false, status: 401, error: "Non authentifié." };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    if (!(await isAdmin(decoded.uid))) {
      // Un accès refusé ne doit pas rester figé dans le cache.
      roleCache.delete(decoded.uid);
      return { ok: false, status: 403, error: "Accès refusé." };
    }

    return { ok: true, uid: decoded.uid };
  } catch (error) {
    console.error("Vérification du jeton impossible:", error.message);
    return { ok: false, status: 401, error: "Session expirée, reconnectez-vous." };
  }
}
