"use client";

import React, { useState, useEffect, useMemo } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";

import Image from "next/image";
import Link from "next/link";

import { getAllSubscriptions } from "@/services/abonement.service";

const AbonementsContent = () => {
  const [abonements, setAbonements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(""); // yyyy-mm-dd
  const [toDate, setToDate] = useState(""); // yyyy-mm-dd
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAllSubscriptions();
      if (response.success) {
        setAbonements(response.data ?? []);
      } else {
        console.error("Failed to fetch abonements");
        setError(response.error ?? null);
      }
    } catch (error) {
      setError(
        "Une erreur s'est produite lors de la récupération des abonements."
      );
      console.error("Error fetching abonements:", error);
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

  const filteredAbonnements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return abonements.filter((o) => {
      const code = (o.code || "").toLowerCase();
      const userName = (o.user?.userName || "").toLowerCase();

      const matchesSearch =
        q === "" ? true : code.includes(q) || userName.includes(q);

      const d = tsToDate(o.createdAt);
      const abonnementsDate = (!from || d >= from) && (!to || d <= to);

      return matchesSearch && abonnementsDate;
    });
  }, [abonements, searchTerm, fromDate, toDate]);

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
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
          placeholder="Rechercher un abonnement par code ou par nom d'utilisateur..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
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
          {filteredAbonnements.length} Abonnement
          {filteredAbonnements.length > 1 ? "s" : ""} trouvé
          {filteredAbonnements.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">Utilisateur</th>
              <th className="px-6 py-3 text-sm font-medium">Saison</th>

              <th className="px-6 py-3 text-sm font-medium">
                Date d&apos;achat
              </th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {filteredAbonnements.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun abonement trouvé
                </td>
              </tr>
            ) : (
              filteredAbonnements.map((abonement) => (
                <tr key={abonement.id} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{abonement?.code}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement?.user?.userName}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement?.abonnement?.title +
                      "(" +
                      abonement?.abonnement?.season +
                      ")"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(abonement?.createdAt)}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <Link
                      href={`/abonnements/${abonement?.code}`}
                      className="bg-blue-600  text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2"
                    >
                      Plus de détails
                    </Link>
                    <Link
                      href={abonement?.downloadUrl || "#"}
                      className="bg-blue-600  text-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2"
                      target="_blank"
                    >
                      Voir l&apos;abonnement
                    </Link>
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

export default AbonementsContent;
