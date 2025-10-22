// app/api/orders/send-tickets/route.ts
import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";

import { Timestamp } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

// --- Next.js route settings ---
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"];

// --- Firebase Admin init (once) ---
const rawCreds = process.env.FIREBASE_CREDENTIALS;
if (!rawCreds) throw new Error("FIREBASE_CREDENTIALS env var missing");
const sa = JSON.parse(rawCreds);
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}

// --- Nodemailer transport (configure via env) ---
// function getTransport() {
//   const {
//     SMTP_HOST,
//     SMTP_PORT,
//     SMTP_USER,
//     SMTP_PASS,
//     // "true" | "false"
//   } = process.env;
//   if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
//     throw new Error("SMTP env vars missing (SMTP_HOST/PORT/USER/PASS).");
//   }
//   return nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: Number(SMTP_PORT),
//     secure: "true",
//     auth: { user: SMTP_USER, pass: SMTP_PASS },
//   });
// }

// --- Utilities ---
const fmtFRDate = (d) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);

//const FROM_EMAIL =
process.env.FROM_EMAIL || '"Mégatoit" <billets@lemegatoit.com>';

// Helper to safely read Timestamp | Date | string to Date
function toDate(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  const t = new Date(value);
  return isNaN(t.getTime()) ? null : t;
}

export async function POST(request) {
  try {
    // --- Parse body for date range (optional override) ---
    const body = (await request.json().catch(() => ({}))) ?? {};
    const startStr = body.startISO ?? "2025-10-14";
    const endStr = body.endISO ?? "2025-10-21";

    // Range: [start, endInclusive] -> Firestore requires endExclusive
    // So we set endExclusive = end + 1 day at 00:00:00
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const endInclusive = new Date(`${endStr}T23:59:59.999Z`);
    const endExclusive = new Date(endInclusive.getTime() + 1); // add 1 ms past 23:59:59.999
    // Alternatively, clearer: new Date(new Date(`${endStr}T00:00:00.000Z`).getTime() + 24*60*60*1000)

    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(endExclusive);

    const ordersSnap = await db
      .collection("orders")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .get();

    if (ordersSnap.empty) {
      return NextResponse.json(
        { ok: true, message: "Aucune commande trouvée dans l'intervalle." },
        { status: 200 }
      );
    }

    //const transport = getTransport();
    const results = [];

    let test = [];
    // Process each order sequentially (safer for rate limits). You can parallelize if needed.
    for (const doc of ordersSnap.docs) {
      const orderId = doc.id;
      const order = doc.data();

      try {
        const uid = order.userId;
        if (!uid) throw new Error("userId manquant");

        // Load user
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error("Utilisateur introuvable");
        const user = userSnap.data() || {};
        const email = user.email;
        if (!email) throw new Error("Email utilisateur manquant");

        // Resolve tickets
        const ticketIds = Array.isArray(order.tickets) ? order.tickets : [];

        const ticketDocs = await Promise.all(
          ticketIds.map((tid) =>
            db.collection("tickets").doc(String(tid)).get()
          )
        );

        // Collect download URLs (ignore missing)
        const ticketLinks = ticketDocs
          .filter((t) => t.exists)
          .map((t) => t.data())
          .map((t) => t?.downloadUrl)
          .filter((u) => typeof u === "string" && u.length > 0);

        // Determine the human date to show (use order.createdAt; fallback to now)
        const createdAtDate = toDate(order.createdAt) ?? new Date(); // fire safety
        const createdAtFR = fmtFRDate(createdAtDate);

        console.log("TEST SEND TICKETS EMAIL:", {
          to: email,
          // from: FROM_EMAIL,
          // subject:
          //   "Lien(s) de téléchargement de vos billets - Mégatoit vs Donnacona",
          ticketLinks,
          createdAtFR,
        });

        // Build email content (FR)
        // const subject =
        //   "Lien(s) de téléchargement de vos billets - Mégatoit vs Donnacona";

        // const linksHtml =
        //   ticketLinks.length > 0
        //     ? `<ul>${ticketLinks
        //         .map((l) => `<li><a href="${l}">${l}</a></li>`)
        //         .join("")}</ul>`
        //     : "<p>(Aucun lien de billet trouvé pour cette commande)</p>";

        // const linksText =
        //   ticketLinks.length > 0
        //     ? ticketLinks.map((l) => `• ${l}`).join("\n")
        //     : "(Aucun lien de billet trouvé pour cette commande)";

        //         const html = `
        // <p>Veuillez trouver ci-dessous le lien de téléchargement de billet pour le match <strong>Mégatoit Vs Donnacona</strong> que vous avez effectué le <strong>${createdAtFR}</strong>.</p>

        // <p><strong>Lien(s) du/des billet(s) :</strong></p>
        // ${linksHtml}

        // <p>Si vous ne les avez pas reçus, il vous est également possible de les consulter et de les télécharger directement à partir de votre profil sur notre site web :</p>
        // <p><a href="https://www.lemegatoit.com" target="_blank" rel="noopener">www.lemegatoit.com</a></p>

        // <p>Nous vous remercions de votre fidélité et avons hâte de vous accueillir lors du prochain match.</p>

        // <p>Cordialement,<br/>
        // L’équipe du Mégatoit de Trois-Rivières</p>
        //         `.trim();

        //         const text = `
        // Veuillez trouver ci-dessous le lien de téléchargement de billet pour le match Mégatoit Vs Donnacona que vous avez effectué le ${createdAtFR}.

        // Lien(s) du/des billet(s):
        // ${linksText}

        // Si vous ne les avez pas reçus, il vous est également possible de les consulter et de les télécharger directement à partir de votre profil sur notre site web :
        // www.lemegatoit.com

        // Nous vous remercions de votre fidélité et avons hâte de vous accueillir lors du prochain match.
        // Cordialement,
        // L’équipe du Mégatoit de Trois-Rivières
        //         `.trim();

        // Send the email
        // await transport.sendMail({
        //   from: FROM_EMAIL,
        //   to: email,
        //   subject,
        //   text,
        //   html,
        // });

        // // Optional: mark order that email was sent
        // await doc.ref.update({
        //   ticketsEmail: {
        //     sentAt: FieldValue.serverTimestamp(),
        //     sentBy: decoded.uid,
        //   },
        // });

        test.push({ orderId, emailTo: email, ticketLinks, createdAtFR });

        results.push({ orderId, emailTo: email, sent: true });
      } catch (err) {
        results.push({
          orderId,
          error: err?.message || String(err),
        });
      }
    }

    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => !r.sent).length;

    return NextResponse.json(
      {
        ok: true,
        test,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("send-tickets route error:", e);
    return NextResponse.json(
      { error: "Erreur serveur", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
