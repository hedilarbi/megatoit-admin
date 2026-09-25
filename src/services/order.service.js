import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  documentId,
  where,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";

const IN_LIMIT = 30;

async function fetchByIds(colName, ids) {
  if (!ids || ids.length === 0) return new Map();
  const colRef = collection(db, colName);

  // Chunk ids to respect Firestore's "in" operator limit
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

export const getOrdersWithDetails = async () => {
  // 1) Load orders (once)
  const ordersSnap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // 2) Collect unique IDs to populate
  const userIds = new Set();
  const promoIds = new Set();

  for (const o of orders) {
    if (o.userId) userIds.add(String(o.userId));
    if (o.promoCodeId) promoIds.add(String(o.promoCodeId));
  }

  // 3) Batch-fetch related docs in parallel
  const [usersById, promosById] = await Promise.all([
    fetchByIds("users", Array.from(userIds)),
    fetchByIds("promoCodes", Array.from(promoIds)),
  ]);

  // 4) Attach without extra reads
  for (const o of orders) {
    if (o.userId) o.userDetails = usersById.get(String(o.userId)) || null;
    if (o.promoCodeId)
      o.promotion = promosById.get(String(o.promoCodeId)) || null;
  }

  return orders;
};

export const getOrdersPaginated = async ({
  pageSize = 10,
  cursorDoc = null,
  searchTerm = "",
  type = "tous",
  fromDate = "",
  toDate = "",
  page = 1,
}) => {
  try {
    const colRef = collection(db, "orders");
    const constraints = [];

    if (fromDate) {
      constraints.push(where("createdAt", ">=", new Date(fromDate)));
    }
    if (toDate) {
      constraints.push(
        where("createdAt", "<=", new Date(`${toDate}T23:59:59.999`))
      );
    }

    const q = searchTerm.trim().toLowerCase();
    // Search/type depend on joined data, so they can't be queried in Firestore:
    // load everything in the date range, filter, then paginate locally
    const clientSide = !!q || type !== "tous";

    const enrich = async (orders) => {
      const userIds = new Set();
      const promoIds = new Set();

      for (const o of orders) {
        if (o.userId) userIds.add(String(o.userId));
        if (o.promoCodeId) promoIds.add(String(o.promoCodeId));
      }

      const [usersById, promosById] = await Promise.all([
        fetchByIds("users", Array.from(userIds)),
        fetchByIds("promoCodes", Array.from(promoIds)),
      ]);

      for (const o of orders) {
        if (o.userId) o.userDetails = usersById.get(String(o.userId)) || null;
        if (o.promoCodeId)
          o.promotion = promosById.get(String(o.promoCodeId)) || null;
      }
      return orders;
    };

    if (clientSide) {
      const allSnap = await getDocs(
        query(colRef, ...constraints, orderBy("createdAt", "desc"))
      );
      let all = allSnap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));

      if (type !== "tous") {
        all = all.filter((o) => (type === "matchs" ? !!o.matchId : !o.matchId));
      }

      await enrich(all);

      if (q) {
        all = all.filter(
          (o) =>
            (o.code || "").toLowerCase().includes(q) ||
            (o.userDetails?.userName || "").toLowerCase().includes(q)
        );
      }

      return {
        success: true,
        orders: all.slice((page - 1) * pageSize, page * pageSize),
        totalCount: all.length,
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

    const ordersSnap = await getDocs(query(colRef, ...dataQueryConstraints));
    const orders = await enrich(
      ordersSnap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }))
    );
    const lastDoc = ordersSnap.docs[ordersSnap.docs.length - 1] || null;

    return {
      success: true,
      orders,
      totalCount,
      lastDoc,
    };
  } catch (error) {
    console.error("Error fetching paginated orders:", error);
    return {
      success: false,
      error: "Une erreur s'est produite lors de la récupération des commandes.",
      orders: [],
      totalCount: 0,
      lastDoc: null,
    };
  }
};

export const getOrderByCode = async (code) => {
  const ordersCollection = collection(db, "orders");
  const ordersSnapshot = await getDocs(ordersCollection);
  const order = ordersSnapshot.docs.find((doc) => doc.data().code === code);

  if (order) {
    const orderData = order.data();

    // Populate user details if userId exists
    if (orderData.userId) {
      const userDocRef = doc(db, "users", orderData.userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        orderData.userDetails = userDoc.data();
      }
    }

    if (orderData.promoCodeId) {
      const promoCodeDocRef = doc(db, "promoCodes", orderData.promoCodeId);
      const promoCodeDoc = await getDoc(promoCodeDocRef);
      if (promoCodeDoc.exists()) {
        orderData.promoCodeDetails = promoCodeDoc.data();
      }
    }
    if (orderData.tickets && Array.isArray(orderData.tickets)) {
      // Populate tickets if tickets array exists
      const tickets = [];
      for (const ticketId of orderData.tickets) {
        const ticketDocRef = doc(db, "tickets", ticketId);
        const ticketDoc = await getDoc(ticketDocRef);
        if (ticketDoc.exists()) {
          tickets.push(ticketDoc.data());
        }
      }
      orderData.ticketsDetails = tickets;
    }

    // Populate match details if matchId exists
    if (orderData.matchId) {
      const matchDocRef = doc(db, "matchs", orderData.matchId);
      const matchDoc = await getDoc(matchDocRef);
      if (matchDoc.exists()) {
        orderData.matchDetails = matchDoc.data();
      }
    }

    // Populate abonnement details if abonnementId exists
    if (orderData.abonnementId) {
      const abonnementDocRef = doc(db, "abonements", orderData.abonnementId);
      const abonnementDoc = await getDoc(abonnementDocRef);
      if (abonnementDoc.exists()) {
        orderData.abonnementDetails = abonnementDoc.data();
      }
    }

    // New orders contain every subscription ID. Keep the legacy singular field
    // as a fallback for orders created before multi-subscription purchases.
    const subscriptionIds = Array.isArray(orderData.subscriptionIds) &&
      orderData.subscriptionIds.length > 0
      ? orderData.subscriptionIds
      : orderData.subscriptionId
        ? [orderData.subscriptionId]
        : [];

    if (subscriptionIds.length > 0) {
      const subscriptionsById = await fetchByIds("subscriptions", subscriptionIds);
      orderData.subscriptionsDetails = subscriptionIds
        .map((subscriptionId) => subscriptionsById.get(String(subscriptionId)))
        .filter(Boolean);
      orderData.subscriptionDetails = orderData.subscriptionsDetails[0] || null;
    }

    return orderData;
  }

  return null;
};
