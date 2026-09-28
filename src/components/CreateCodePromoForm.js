"use client";
import React, { useEffect, useState } from "react";
import { createPromoCode, getUpcomingMatches } from "@/services/match.service";
import toast from "react-hot-toast";

const QUEBEC_TZ = "America/Toronto";

const getDateTokenInQuebec = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: QUEBEC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

// Stored wall time, same technique as the match dates elsewhere (Etc/GMT-1)
const formatMatchDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(
    timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
  );
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const str = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Etc/GMT-1",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${dayName}, ${str}`;
};

// Domicile => opponent vs Trois-Rivières, as on the client site
const matchTitle = (m) =>
  m?.type === "Domicile"
    ? `${m?.opponent?.name || ""} vs ${m?.homeTeam?.name || "BSR DE TROIS-RIVIÈRES"}`
    : `${m?.homeTeam?.name || "BSR DE TROIS-RIVIÈRES"} vs ${m?.opponent?.name || ""}`;

const toMillis = (timestamp) =>
  timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

const CreateCodePromoForm = () => {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");

  const [error, setError] = useState(null);

  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [usagePerUser, setUsagePerUser] = useState(1);
  const [typeOfUsage, setTypeOfUsage] = useState("limited");
  const [typeOfTotalUsage, setTypeOfTotalUsage] = useState("limited");
  const [totalUsage, setTotalUsage] = useState(1);

  // "freeTicket" codes are attached to one upcoming match
  const [matchId, setMatchId] = useState("");
  const [upcomingMatches, setUpcomingMatches] = useState(null);

  useEffect(() => {
    if (type !== "freeTicket" || upcomingMatches) return;
    getUpcomingMatches().then((response) => {
      if (response.success) setUpcomingMatches(response.data);
      else toast.error(response.error);
    });
  }, [type, upcomingMatches]);

  const selectedMatch = upcomingMatches?.find((m) => m.id === matchId);
  // Where the free tickets go: the next home match after the selected one
  const freeMatch = selectedMatch
    ? upcomingMatches.find(
        (m) =>
          m.type === "Domicile" &&
          toMillis(m.date) > toMillis(selectedMatch.date)
      )
    : null;

  const handleCreate = async () => {
    if (!code) {
      setError("Code obligatoire");
      return;
    }
    if ((type === "amount" || type === "percent") && !value) {
      setError("Valeur obligatoire");
      return;
    }
    if (type === "percent" && (value < 0 || value > 100)) {
      setError("Pourcentage doit être entre 0 et 100");
      return;
    }
    if (type === "amount" && value <= 0) {
      setError("Montant doit être supérieur à 0");
      return;
    }

    if (type === "freeTicket" && !matchId) {
      setError("Match obligatoire");
      return;
    }

    if (!endDate) {
      setError("Date de fin obligatoire");
      return;
    }
    if (typeOfUsage === "limited" && usagePerUser <= 0) {
      setError("Usage par utilisateur doit être supérieur à 0");
      return;
    }
    if (typeOfTotalUsage === "limited" && totalUsage <= 0) {
      setError("Usage total doit être supérieur à 0");
      return;
    }

    setError(null);

    try {
      setCreating(true);
      // Limits are stored as numbers: the client only enforces them when
      // typeof === "number", and <input type="number"> yields strings.
      const response = await createPromoCode({
        code: code.toUpperCase(),
        type,
        amount: type === "amount" ? value : null,
        percent: type === "percent" ? value : null,
        matchId: type === "freeTicket" ? matchId : null,
        startDate: getDateTokenInQuebec(),
        usagePerUser: typeOfUsage === "limited" ? Number(usagePerUser) : null,
        totalUsage: typeOfTotalUsage === "limited" ? Number(totalUsage) : null,
        endDate,
      });

      if (response.success) {
        setCode("");
        setType("percent");
        setValue("");
        setEndDate("");
        setMatchId("");
        setUsagePerUser(1);
        setTypeOfUsage("limited");
        setTypeOfTotalUsage("limited");
        setTotalUsage(1);
        setError(null);
        toast.success("Code promotionnel créé avec succès !");
      } else {
        toast.error("Erreur lors de la création du code promotionnel");
        setError(
          response.message || "Erreur lors de la création du code promotionnel"
        );
      }
    } catch (err) {
      console.error("Erreur lors de la création du code promo :", err);
      toast.error(
        "Une erreur s'est produite lors de la création du code promo"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-[calc(100vh-100px)] overflow-y-auto flex flex-col">
      <div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="percent">Réduction - Pourcentage</option>
              <option value="amount">Réduction - Montant fixe</option>
              <option value="freeTicket">
                Billet gratuit - prochain match à domicile
              </option>
            </select>
          </div>
          {type === "freeTicket" ? (
            <div className="space-y-2">
              <label
                htmlFor="matchId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Match
              </label>
              <select
                id="matchId"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                disabled={!upcomingMatches}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">
                  {upcomingMatches
                    ? "Choisir un match à venir"
                    : "Chargement des matchs..."}
                </option>
                {upcomingMatches?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {matchTitle(m)} - {formatMatchDate(m.date)}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                Le code ne fonctionne que pour ce match. Pour chaque billet
                acheté avec ce code, le client reçoit un billet gratuit pour
                le match à domicile qui suit. Le prix de la commande n&apos;est
                pas réduit.
              </p>
              {selectedMatch &&
                (freeMatch ? (
                  <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
                    Billets gratuits pour : {matchTitle(freeMatch)} -{" "}
                    {formatMatchDate(freeMatch.date)}
                  </p>
                ) : (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    Aucun match à domicile après ce match : le code sera
                    refusé tant qu&apos;un match à domicile n&apos;est pas
                    ajouté.
                  </p>
                ))}
            </div>
          ) : (
            <div>
              <label
                htmlFor="value"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Valeur
              </label>

              <input
                type="text"
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
          <div className="">
            <label
              htmlFor="usagePerUser"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usage par utilisateur
            </label>
            <div className="flex items-center gap-4 mb-2">
              <button
                className={`${
                  typeOfUsage === "limited"
                    ? "border-2 border-black bg-black text-white"
                    : "bg-white border-2 border-gray-500 text-black"
                } px-4 py-2 rounded-md`}
                onClick={() => setTypeOfUsage("limited")}
              >
                <span>limité</span>
              </button>

              <button
                className={`${
                  typeOfUsage === "unlimited"
                    ? "border-2 border-black bg-black text-white"
                    : "bg-white border-2 border-gray-500 text-black"
                } px-4 py-2 rounded-md`}
                onClick={() => setTypeOfUsage("unlimited")}
              >
                <span>illimité</span>
              </button>
            </div>
            {typeOfUsage === "limited" && (
              <input
                type="number"
                id="limitedUsage"
                value={usagePerUser}
                onChange={(e) => setUsagePerUser(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            )}
          </div>
          <div className="">
            <label
              htmlFor="usagePerUser"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usage Total
            </label>
            <div className="flex items-center gap-4 mb-2">
              <button
                className={`${
                  typeOfTotalUsage === "limited"
                    ? "border-2 border-black bg-black text-white"
                    : "bg-white border-2 border-gray-500 text-black"
                } px-4 py-2 rounded-md`}
                onClick={() => setTypeOfTotalUsage("limited")}
              >
                <span>limité</span>
              </button>

              <button
                className={`${
                  typeOfTotalUsage === "unlimited"
                    ? "border-2 border-black bg-black text-white"
                    : "bg-white border-2 border-gray-500 text-black"
                } px-4 py-2 rounded-md`}
                onClick={() => setTypeOfTotalUsage("unlimited")}
              >
                <span>illimité</span>
              </button>
            </div>
            {typeOfTotalUsage === "limited" && (
              <input
                type="number"
                id="limitedTotalUsage"
                value={totalUsage}
                onChange={(e) => setTotalUsage(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            )}
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date de fin
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="bg-black text-white px-6 py-2 rounded transition font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {creating ? "Création..." : "Créer le code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCodePromoForm;
