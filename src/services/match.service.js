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
    const matchsSnapshot = await getDocs(matchsCollection);
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
    const ticketsSnapshot = await getDocs(ticketsCollection);
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
