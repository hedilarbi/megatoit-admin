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
} from "firebase/firestore";

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

export const getAllTickets = async () => {
  try {
    const ticketsCollection = collection(db, "tickets");
    const ticketsQuery = query(ticketsCollection, orderBy("createdAt", "desc"));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
