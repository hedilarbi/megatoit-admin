"use client";
import { getAllTickets } from "@/services/match.service";
import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";

const TicketsContent = () => {
  const [tickets, setTickets] = useState([]);
  const [ticketsList, setTicketsList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllTickets();
      if (response.success) {
        setTickets(response.data ?? []);
        setTicketsList(response.data ?? []); // Assuming you want to keep this state for some reason
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

  const handleSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredMatchs = ticketsList.filter((ticket) =>
      ticket.TicketCode.toLowerCase().includes(searchTerm)
    );
    setTickets(filteredMatchs);
  };
  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, []);
  const formatDate = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const options = {
      weekday: "long", // "Lundi"
      day: "numeric", // "24"
      month: "long", // "mars"
      year: "numeric", // "2025"
      hour: "2-digit", // "13"
      minute: "2-digit", // "00"
      hour12: false, // Use 24-hour format
    };

    const formattedDate = date
      .toLocaleDateString("fr-FR", options)
      .replace(",", " à"); // Replace comma with " à"
    return formattedDate;
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
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un match..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={handleSearch}
        />
      </div>

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">
                Date d&apos;achat
              </th>

              <th className="px-6 py-3 text-sm font-medium">Prix (HT)</th>
              <th className="px-6 py-3 text-sm font-medium">Etat du billet</th>

              <th className="px-6 py-3 text-sm font-medium">Lien du billet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {tickets.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun billet trouvé
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.TicketCode}
                  className="hover:bg-gray-100 transition"
                >
                  <td className="px-6 py-4 text-gray-700">
                    {ticket.TicketCode}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {ticket.price.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "CAD",
                    })}
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
