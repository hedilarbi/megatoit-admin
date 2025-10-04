"use client";
import { deleteMatch, getAllMatches } from "@/services/match.service";
import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";
import { IoPencil, IoTrash } from "react-icons/io5";
import Image from "next/image";
import Link from "next/link";
import DeleteWarningModal from "./DeleteWarningModal";
import toast from "react-hot-toast";
const MatchsContent = () => {
  const [matchs, setMatchs] = useState([]);
  const [matchsList, setMatchsList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllMatches();
      if (response.success) {
        console.log("Fetched matchs:", response.data);
        setMatchs(response.data ?? []);
        setMatchsList(response.data ?? []); // Assuming you want to keep this state for some reason
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
    const filteredMatchs = matchsList.filter((match) =>
      match.opponent.name.toLowerCase().includes(searchTerm)
    );
    setMatchs(filteredMatchs);
  };
  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, [refresh]);
  const formatDate = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
    let time = date.toTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    time = time.substring(0, 5); // Extracting only the time part (HH:MM)
    const formattedDateShort = date.toLocaleDateString("fr-FR", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    const formattedDate = `${dayName} ${formattedDateShort} à ${time}`;
    return formattedDate;
  };
  const handleDelete = async () => {
    try {
      setSubmitting(true);

      const response = await deleteMatch(matchToDelete.id);
      if (response.success) {
        toast.success("Match supprimé avec succès !");
        setRefresh((prev) => prev + 1); // Trigger a refresh in the parent component
        setShowDeleteModal(false);
      } else {
        toast.error(
          response.error || "Erreur lors de la suppression du match."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du match :", error);
      toast.error("Erreur lors de la suppression du match.");
    } finally {
      setSubmitting(false);
    }
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
      {showDeleteModal && (
        <DeleteWarningModal
          setShowModal={setShowDeleteModal}
          message="Êtes-vous sûr de vouloir supprimer ce match ? Cette action est irréversible."
          deleter={handleDelete}
        />
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un match par adversaire..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={handleSearch}
        />
      </div>
      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30  z-20">
          <Spinner />
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Adversaire</th>
              <th className="px-6 py-3 text-sm font-medium">Date du match</th>

              <th className="px-6 py-3 text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-sm font-medium">Catégorie</th>

              <th className="px-6 py-3 text-sm font-medium">
                Nombre de sièges disponibles
              </th>
              <th className="px-6 py-3 text-sm font-medium">Billets vendus</th>

              <th className="px-6 py-3 text-sm font-medium">Billets utilisé</th>
              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {matchs.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun match trouvé
                </td>
              </tr>
            ) : (
              matchs.map((match) => (
                <tr key={match.id} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">
                    {match.opponent.name}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(match.date)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {match.type || "Non spécifié"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {match.category || "Non spécifié"}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {match.availableSeats}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {match.totalSeats - (match.availableSeats || 0)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {match.usedTicketsCount || 0}
                  </td>
                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <Link
                      href={`/matchs/${match.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <IoPencil size={22} />
                    </Link>
                    <button
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      onClick={() => {
                        setMatchToDelete(match);
                        setShowDeleteModal(true);
                      }}
                    >
                      <IoTrash size={22} />
                    </button>
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

export default MatchsContent;
