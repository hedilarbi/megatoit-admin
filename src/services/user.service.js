import { db } from "@/lib/firebase";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  where,
  getDocs,
  query,
  limit,
  startAfter,
  getCountFromServer,
  orderBy,
} from "firebase/firestore";

export const getUserDocument = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user document:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersCollection = collection(db, "users");
    const clientsQuery = query(usersCollection, where("type", "==", "client"));
    const clientsSnapshot = await getDocs(clientsQuery);
    const clients = [];
    clientsSnapshot.forEach((doc) => {
      clients.push({ ...doc.data(), uid: doc.id });
    });
    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, error: "Failed to fetch clients" };
  }
};

export const getUsersPaginated = async ({
  pageSize = 10,
  cursorDoc = null,
  searchTerm = "",
  page = 1,
}) => {
  try {
    const colRef = collection(db, "users");
    const constraints = [where("type", "==", "client")];

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      // Firestore has no "contains" query: load every client, filter, then paginate locally
      const allSnap = await getDocs(
        query(colRef, ...constraints, orderBy("createdAt", "desc"))
      );
      const matches = allSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter(
          (u) =>
            (u.userName || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        );
      return {
        success: true,
        users: matches.slice((page - 1) * pageSize, page * pageSize),
        totalCount: matches.length,
        lastDoc: null,
      };
    }

    const countQuery = query(colRef, ...constraints);
    const countSnap = await getCountFromServer(countQuery);
    const totalCount = countSnap.data().count;

    const dataQueryConstraints = [
      ...constraints,
      orderBy("createdAt", "desc"),
    ];

    if (cursorDoc) {
      dataQueryConstraints.push(startAfter(cursorDoc));
    }

    dataQueryConstraints.push(limit(pageSize));

    const snap = await getDocs(query(colRef, ...dataQueryConstraints));
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data(), _doc: d }));
    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return {
      success: true,
      users,
      totalCount,
      lastDoc,
    };
  } catch (error) {
    console.error("Error fetching paginated users:", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la récupération des utilisateurs.",
      users: [],
      totalCount: 0,
      lastDoc: null,
    };
  }
};

export const getAllEmployees = async () => {
  try {
    const usersCollection = collection(db, "users");
    const employeesQuery = query(
      usersCollection,
      where("type", "==", "employee")
    );
    const employeesSnapshot = await getDocs(employeesQuery);
    const employees = [];
    employeesSnapshot.forEach((doc) => {
      employees.push({ ...doc.data(), uid: doc.id });
    });
    return { success: true, data: employees };
  } catch (error) {
    console.error("Error fetching employees:", error);
    return { success: false, error: "Failed to fetch employees" };
  }
};

export const updateAccountStatus = async (uid, status) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { status }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating account status:", error);
    return { success: false, error: "Failed to update account status" };
  }
};
