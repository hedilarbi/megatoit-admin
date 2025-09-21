"use client";
import { getAllTickets } from "@/services/match.service";
import React, { useState, useEffect, useMemo } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";

const TicketsContent = () => {
  const [tickets, setTickets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllTickets();
      if (response.success) {
        setTickets(response.data ?? []);
      } else {
        console.error("Failed to fetch matchs");
        setError(response.error ?? null);
      }
    } catch (error) {
      setError("Une erreur s'est produite lors de la récupération des matchs.");
      console.error("Error fetching matchs:", error);
    } finally {
      setLoading(false);
    }
  };
  const tsToDate = (ts) =>
    new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000);
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = tsToDate(timestamp);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}/${pad(
      date.getMonth() + 1
    )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, []);
  const filteredTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return tickets.filter((o) => {
      const code = (o.TicketCode || "").toLowerCase();
      const userName = (o.userDetails?.userName || "").toLowerCase();

      const matchesSearch =
        q === "" ? true : code.includes(q) || userName.includes(q);

      const matchesMatch =
        !selectedMatch ||
        (o.matchDetails?.date &&
          `${o.matchDetails.date.seconds}-${o.matchDetails.date.nanoseconds}` ===
            selectedMatch);

      const d = tsToDate(o.createdAt);
      const matchesDate = (!from || d >= from) && (!to || d <= to);

      return matchesSearch && matchesDate && matchesMatch;
    });
  }, [tickets, searchTerm, fromDate, toDate, selectedMatch]);

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedMatch("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] ">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="text-center mt-4 flex flex-col items-center">
          <Image
            src={WarningIcon}
            alt="Error"
            width={200}
            height={200}
            className="w-48 h-48"
          />
          <p className="text-gray-500">
            Oups, quelque chose s&apos;est mal passé
          </p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Rechercher un billet par code ou nom d'utilisateur..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div>
          <div className="">
            <select
              id="matchFilter"
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
            >
              <option value="">Tous les matchs</option>
              {Array.from(
                new Map(
                  tickets
                    .filter((t) => t.matchDetails?.date)
                    .map((t) => [
                      t.matchDetails.date.seconds +
                        "-" +
                        t.matchDetails.date.nanoseconds,
                      t.matchDetails.date,
                    ])
                ).values()
              ).map((match) => (
                <option
                  key={match.seconds + "-" + match.nanoseconds}
                  value={match.seconds + "-" + match.nanoseconds}
                >
                  {formatDate(match)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <label htmlFor="fromDate">Date d&apos;achat de début</label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="toDate">Date d&apos;achat de fin</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 bg-gray-300 text-black rounded-lg cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>

      <div className="flex items-center mb-4">
        <p className=" text-gray-600">
          {filteredTickets.length} Billet
          {filteredTickets.length > 1 ? "s" : ""} trouvé
          {filteredTickets.length > 1 ? "s" : ""}
        </p>
        <span className="ml-6 text-gray-700 font-semibold">
          Total: $
          {filteredTickets.reduce(
            (sum, o) => sum + (o.orderDetails.amount || 0),
            0
          ) / 100}
        </span>
      </div>

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
              <th className="px-6 py-3 text-sm font-medium">
                Date d&apos;achat
              </th>

              <th className="px-6 py-3 text-sm font-medium">Payé</th>
              <th className="px-6 py-3 text-sm font-medium">Date du match</th>
              <th className="px-6 py-3 text-sm font-medium">Etat du billet</th>

              <th className="px-6 py-3 text-sm font-medium">Lien du billet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {filteredTickets.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun billet trouvé
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.TicketCode}
                  className="hover:bg-gray-100 transition"
                >
                  <td className="px-6 py-4 text-gray-700">
                    {ticket.TicketCode}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {ticket.userDetails?.userName || "N/A"}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {(ticket.orderDetails.amount / 100).toLocaleString(
                      "fr-FR",
                      {
                        style: "currency",
                        currency: "CAD",
                      }
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(ticket.matchDetails?.date) || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {ticket.isUsed ? "Utilisé" : "Disponible"}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <a
                      target="_blank"
                      href={ticket.downloadUrl}
                      className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
                    >
                      Voir le billet
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TicketsContent;
