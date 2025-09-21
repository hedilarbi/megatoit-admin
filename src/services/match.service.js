import { db } from "@/lib/firebase";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  where,
  getDocs,
  query,
  deleteDoc,
  orderBy,
  documentId,
} from "firebase/firestore";
const IN_LIMIT = 30;

export const addMatch = async (match) => {
  try {
    const matchsCollection = collection(db, "matchs");

    // Check for existing match with the same date
    const dateQuery = query(matchsCollection, where("date", "==", match.date));
    const dateSnapshot = await getDocs(dateQuery);
    if (!dateSnapshot.empty) {
      return {
        success: false,
        error: "Un match avec la même date existe déjà",
      };
    }

    const matchRef = doc(collection(db, "matchs"));
    await setDoc(matchRef, match);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'ajout du match :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de l'ajout du match",
    };
  }
};

export const getAllMatches = async () => {
  try {
    const matchsCollection = collection(db, "matchs");

    const q = query(matchsCollection, orderBy("date", "asc"));
    const matchsSnapshot = await getDocs(q);
    const matchs = matchsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, data: matchs };
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la récupération des matchs",
    };
  }
};

export const getMatchByUid = async (uid) => {
  try {
    const matchDoc = await getDoc(doc(db, "matchs", uid));
    return { success: true, data: matchDoc.data() };
  } catch (error) {
    console.error("Erreur lors de la récupération du match par UID :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération du match par UID",
    };
  }
};

export const updateMatch = async (id, updatedMatch) => {
  try {
    const matchsCollection = collection(db, "matchs");

    // Check for existing match with the same title (excluding the current match)

    const dateQuery = query(
      matchsCollection,
      where("date", "==", updatedMatch.date)
    );

    const dateSnapshot = await getDocs(dateQuery);
    if (!dateSnapshot.empty && dateSnapshot.docs.some((doc) => doc.id !== id)) {
      return {
        success: false,
        error: "Un match avec la même date existe déjà",
      };
    }

    const matchRef = doc(db, "matchs", id);
    const matchDoc = await getDoc(matchRef);

    if (!matchDoc.exists()) {
      return { success: false, error: "Le match à mettre à jour n'existe pas" };
    }

    await setDoc(matchRef, updatedMatch, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du match :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la mise à jour du match",
    };
  }
};

export const deleteMatch = async (id) => {
  try {
    const matchRef = doc(db, "matchs", id);
    const matchDoc = await getDoc(matchRef);

    if (!matchDoc.exists()) {
      return { success: false, error: "Le match à supprimer n'existe pas" };
    }

    await deleteDoc(matchRef);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression du match :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la suppression du match",
    };
  }
};

export const getTeams = async () => {
  try {
    const teamsCollection = collection(db, "teams");
    const teamsSnapshot = await getDocs(teamsCollection);
    const teams = teamsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, data: teams };
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la récupération des équipes",
    };
  }
};

async function fetchByIds(colName, ids) {
  if (!ids || ids.length === 0) return new Map();
  const colRef = collection(db, colName);

  // chunk ids to respect Firestore "in" limit
  const chunks = [];
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    chunks.push(ids.slice(i, i + IN_LIMIT));
  }

  const maps = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(colRef, where(documentId(), "in", chunk));
      const snap = await getDocs(q);
      const m = new Map();
      snap.forEach((d) => m.set(d.id, { id: d.id, ...d.data() }));
      return m;
    })
  );

  // merge maps
  return maps.reduce((acc, m) => {
    m.forEach((v, k) => acc.set(k, v));
    return acc;
  }, new Map());
}

export const getAllTickets = async () => {
  try {
    // 1) fetch tickets once
    const ticketsSnap = await getDocs(
      query(collection(db, "tickets"), orderBy("createdAt", "desc"))
    );
    const tickets = ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 2) collect unique IDs
    const userIds = new Set();
    const matchIds = new Set();
    const orderIds = new Set();

    for (const t of tickets) {
      if (t.userId) userIds.add(String(t.userId));
      if (t.matchId) matchIds.add(String(t.matchId));
      if (t.orderId) orderIds.add(String(t.orderId));
    }

    // 3) batch fetch related docs in parallel
    const [usersById, matchsById, ordersById] = await Promise.all([
      fetchByIds("users", Array.from(userIds)),
      fetchByIds("matchs", Array.from(matchIds)),
      fetchByIds("orders", Array.from(orderIds)),
    ]);

    // 4) attach (no extra reads)
    for (const t of tickets) {
      if (t.userId) t.userDetails = usersById.get(String(t.userId)) || null;
      if (t.matchId) t.matchDetails = matchsById.get(String(t.matchId)) || null;
      if (t.orderId) t.orderDetails = ordersById.get(String(t.orderId)) || null;
    }

    return { success: true, data: tickets };
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la récupération des tickets",
    };
  }
};

export const createPromoCode = async (codeData) => {
  try {
    const promoCodesCollection = collection(db, "promoCodes");
    console.log("codeData", codeData);
    // Check for existing promo code with the same code
    const codeQuery = query(
      promoCodesCollection,
      where("code", "==", codeData.code)
    );
    const codeSnapshot = await getDocs(codeQuery);
    if (!codeSnapshot.empty) {
      return {
        success: false,
        error: "Un code promo avec le même nom existe déjà",
      };
    }

    const promoCodeRef = doc(collection(db, "promoCodes"));
    await setDoc(promoCodeRef, codeData);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la création du code promo :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la création du code promo",
    };
  }
};

export const getAllPromoCodes = async () => {
  try {
    const promoCodesCollection = collection(db, "promoCodes");
    const promoCodesSnapshot = await getDocs(promoCodesCollection);
    const promoCodes = promoCodesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data: promoCodes };
  } catch (error) {
    console.error("Erreur lors de la récupération des codes promo :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération des codes promo",
    };
  }
};

export const deletePromoCode = async (id) => {
  try {
    const promoCodeRef = doc(db, "promoCodes", id);
    const promoCodeDoc = await getDoc(promoCodeRef);

    if (!promoCodeDoc.exists()) {
      return {
        success: false,
        error: "Le code promo à supprimer n'existe pas",
      };
    }

    await deleteDoc(promoCodeRef);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression du code promo :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la suppression du code promo",
    };
  }
};
