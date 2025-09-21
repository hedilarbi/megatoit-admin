import { db } from "@/lib/firebase";

import {
  orderBy,
  doc,
  setDoc,
  getDoc,
  collection,
  where,
  getDocs,
  query,
  deleteDoc,
  documentId,
} from "firebase/firestore";
const IN_LIMIT = 30;
export const addAbonement = async (abonement) => {
  try {
    const abonementsCollection = collection(db, "abonements");

    // Check for existing abonement with the same title
    const titleQuery = query(
      abonementsCollection,
      where("season", "==", abonement.season)
    );
    const titleSnapshot = await getDocs(titleQuery);
    if (!titleSnapshot.empty) {
      return {
        success: false,
        error: "Un abonnement avec la même saison existe déjà",
      };
    }

    const abonementRef = doc(collection(db, "abonements"));
    await setDoc(abonementRef, abonement);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'abonnement :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de l'ajout de l'abonnement",
    };
  }
};

export const getAllAbonements = async () => {
  try {
    const abonementsCollection = collection(db, "abonements");
    const abonementsSnapshot = await getDocs(abonementsCollection);
    const abonements = abonementsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data: abonements };
  } catch (error) {
    console.error("Erreur lors de la récupération des abonnements :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération des abonnements",
    };
  }
};

export const updateAbonement = async (abonementId, updatedData) => {
  try {
    const abonementRef = doc(db, "abonements", abonementId);
    const abonementDoc = await getDoc(abonementRef);
    if (!abonementDoc.exists()) {
      return {
        success: false,
        error: "L'abonnement à mettre à jour n'existe pas",
      };
    }

    await setDoc(abonementRef, updatedData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'abonnement :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la mise à jour de l'ab  onnement",
    };
  }
};

export const getAbonementById = async (abonementId) => {
  try {
    const abonementDoc = await getDoc(doc(db, "abonements", abonementId));
    if (abonementDoc.exists()) {
      return { success: true, data: abonementDoc.data() };
    } else {
      return { success: false, error: "Abonnement non trouvé" };
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'abonnement :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération de l'abonnement",
    };
  }
};

export const deleteAbonnement = async (id) => {
  try {
    const abonementRef = doc(db, "abonements", id);
    const abonementDoc = await getDoc(abonementRef);

    if (!abonementDoc.exists()) {
      return { success: false, error: "L'abonnement à supprimer n'existe pas" };
    }

    await deleteDoc(abonementRef);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'abonnement :", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la suppression de l'abonnement",
    };
  }
};

async function fetchByIds(colName, ids) {
  if (!ids || ids.length === 0) return new Map();
  const colRef = collection(db, colName);

  // Chunk to respect Firestore's "in" limit
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

  // Merge chunk maps
  return maps.reduce((acc, m) => {
    m.forEach((v, k) => acc.set(k, v));
    return acc;
  }, new Map());
}

export const getAllSubscriptions = async () => {
  try {
    // 1) Load subscriptions once
    const subsSnap = await getDocs(
      query(collection(db, "subscriptions"), orderBy("createdAt", "desc"))
    );
    const subscriptions = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 2) Collect unique foreign keys (IDs)
    const userIds = new Set();
    const orderIds = new Set();
    const abonnementIds = new Set();

    for (const s of subscriptions) {
      if (s.userId) userIds.add(String(s.userId));
      if (s.orderId) orderIds.add(String(s.orderId));
      if (s.abonnementId) abonnementIds.add(String(s.abonnementId));
    }

    // 3) Batch fetch related docs in parallel
    const [usersById, ordersById, abonnementsById] = await Promise.all([
      fetchByIds("users", Array.from(userIds)),
      fetchByIds("orders", Array.from(orderIds)),
      fetchByIds("abonements", Array.from(abonnementIds)),
    ]);

    // 4) Attach without extra reads
    for (const s of subscriptions) {
      s.user = s.userId ? usersById.get(String(s.userId)) || null : null;
      s.order = s.orderId ? ordersById.get(String(s.orderId)) || null : null;
      s.abonnement = s.abonnementId
        ? abonnementsById.get(String(s.abonnementId)) || null
        : null;
    }

    return { success: true, data: subscriptions };
  } catch (error) {
    console.error("Erreur lors de la récupération des subscriptions :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération des subscriptions",
    };
  }
};

export const getSubscriptionByCode = async (code) => {
  try {
    // Get the subscription by code
    const subscriptionsCollection = collection(db, "subscriptions");
    const subscriptionQuery = query(
      subscriptionsCollection,
      where("code", "==", code)
    );
    const subscriptionSnapshot = await getDocs(subscriptionQuery);

    if (subscriptionSnapshot.empty) {
      return {
        success: false,
        error: "Aucune souscription trouvée avec ce code",
      };
    }

    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionData = subscriptionDoc.data();

    // Populate abonnement
    let abonnement = null;
    if (subscriptionData.abonnementId) {
      const abonementDoc = await getDoc(
        doc(db, "abonements", subscriptionData.abonnementId)
      );
      abonnement = abonementDoc.exists()
        ? { id: abonementDoc.id, ...abonementDoc.data() }
        : null;
    }

    // Populate user
    let user = null;
    if (subscriptionData.userId) {
      const userDoc = await getDoc(doc(db, "users", subscriptionData.userId));
      user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
    }

    // Populate matchs
    let matchs = [];
    if (Array.isArray(subscriptionData.matchs)) {
      const matchPromises = subscriptionData.matchs.map(async (matchId) => {
        const matchDoc = await getDoc(doc(db, "matchs", matchId.matchId));
        return matchDoc.exists()
          ? { id: matchDoc.id, ...matchDoc.data() }
          : null;
      });
      matchs = (await Promise.all(matchPromises)).filter(Boolean);
    }

    return {
      success: true,
      data: {
        id: subscriptionDoc.id,
        ...subscriptionData,
        abonnement,
        user,
        matchs,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération de la souscription :", error);
    return {
      success: false,
      error:
        "Une erreur s'est produite lors de la récupération de la souscription",
    };
  }
};
