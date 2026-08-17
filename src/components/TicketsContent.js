"use client";
import { getTicketsPaginated, getAllMatches } from "@/services/match.service";
import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";
import { WarningIcon } from "@/assets/svgs";
import Image from "next/image";
import Pagination from "./Pagination";

const TicketsContent = () => {
  const [tickets, setTickets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("tous"); // "all" | "used" | "unused"

  // Server Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cursors, setCursors] = useState({ 1: null });

  const fetchData = async (page = currentPage, pageSize = itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);
      const cursorDoc = cursors[page] || null;

      const response = await getTicketsPaginated({
        pageSize,
        cursorDoc,
        searchTerm,
        selectedMatch,
        fromDate,
        toDate,
        ticketStatus,
      });

      if (response.success) {
        setTickets(response.tickets);
        setTotalCount(response.totalCount);

        if (response.lastDoc) {
          setCursors((prev) => ({ ...prev, [page + 1]: response.lastDoc }));
        }
      } else {
        setError(response.error || "Impossible de récupérer les billets.");
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Une erreur s'est produite lors de la récupération des billets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMatches = async () => {
      const res = await getAllMatches();
      if (res.success) setMatches(res.data || []);
    };
    loadMatches();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setCursors({ 1: null });
    fetchData(1, itemsPerPage);
  }, [searchTerm, fromDate, toDate, selectedMatch, ticketStatus, itemsPerPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, itemsPerPage);
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

  const formatMatchDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const str = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Etc/GMT-1", // ← freeze at UTC
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

    return str;
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedMatch("");
    setTicketStatus("tous");
    setCurrentPage(1);
    setCursors({ 1: null });
  };

  if (loading && tickets.length === 0) {
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
            onClick={() => fetchData(1, itemsPerPage)}
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div>
          <div className="">
            <select
              id="matchFilter"
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
            >
              <option value="">Tous les matchs</option>
              {matches.map((match) => (
                <option
                  key={match.id}
                  value={match.date ? `${match.date.seconds}-${match.date.nanoseconds}` : match.id}
                >
                  {formatMatchDate(match.date)}
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
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="toDate">Date d&apos;achat de fin</label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="type">État:</label>
          <select
            id="type"
            value={ticketStatus}
            onChange={(e) => setTicketStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="tous">Tous</option>
            <option value="true">Utilisé</option>
            <option value="false">Disponible</option>
          </select>
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
          {totalCount} Billet
          {totalCount > 1 ? "s" : ""} trouvé
          {totalCount > 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand text-black">
              <tr>
                <th className="px-6 py-3 text-sm font-medium">Code</th>
                <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
                <th className="px-6 py-3 text-sm font-medium">
                  Date d&apos;achat
                </th>

                <th className="px-6 py-3 text-sm font-medium">Date du match</th>
                <th className="px-6 py-3 text-sm font-medium">Etat du billet</th>

                <th className="px-6 py-3 text-sm font-medium">Lien du billet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr className="text-center">
                  <td colSpan={6} className="px-6 py-4 text-gray-500">
                    Aucun billet trouvé
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.TicketCode || ticket.id}
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
                      {formatMatchDate(ticket.matchDetails?.date) || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {ticket.isUsed ? "Utilisé" : "Disponible"}
                    </td>

                    <td className="px-6 py-4 flex space-x-5 items-center ">
                      <a
                        target="_blank"
                        href={ticket.downloadUrl}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
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

        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
            setCursors({ 1: null });
          }}
        />
      </div>
    </>
  );
};

export default TicketsContent;
