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

    // Populate subscription details if subscriptionId exists
    if (orderData.subscriptionId) {
      const subscriptionDocRef = doc(
        db,
        "subscriptions",
        orderData.subscriptionId
      );
      const subscriptionDoc = await getDoc(subscriptionDocRef);
      if (subscriptionDoc.exists()) {
        orderData.subscriptionDetails = subscriptionDoc.data();
      }
    }

    return orderData;
  }

  return null;
};
