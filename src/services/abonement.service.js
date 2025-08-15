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

export const getAllSubscriptions = async () => {
  try {
    const subscriptionsCollection = collection(db, "subscriptions");
    const subscriptionsQuery = query(
      subscriptionsCollection,
      orderBy("createdAt", "desc")
    );
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

    // Fetch all abonements once and map by id for quick lookup
    const abonementsSnapshot = await getDocs(collection(db, "abonements"));
    const abonementsMap = {};
    abonementsSnapshot.forEach((doc) => {
      abonementsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    const subscriptions = subscriptionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const abonnementId = data.abonnementId;
      return {
        id: doc.id,
        ...data,
        abonnement: abonnementId ? abonementsMap[abonnementId] || null : null,
      };
    });

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
