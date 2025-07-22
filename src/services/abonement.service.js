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
