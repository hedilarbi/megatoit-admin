"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";
import { IoPencil, IoTrash } from "react-icons/io5";
import Image from "next/image";
import Link from "next/link";
import DeleteWarningModal from "./DeleteWarningModal";
import {
  deleteAbonnement,
  getAllAbonements,
} from "@/services/abonement.service";
import toast from "react-hot-toast";
const AbonementsContent = () => {
  const [abonements, setAbonements] = useState([]);
  const [abonementsList, setAbonementsList] = useState([]); // Unused state, can be removed if not needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [abonementToDelete, setAbonementToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAllAbonements();
      if (response.success) {
        setAbonements(response.data ?? []);
        setAbonementsList(response.data ?? []); // Assuming you want to keep this state for some reason
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

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const response = await deleteAbonnement(abonementToDelete?.id);
      if (response.success) {
        setRefresh((prev) => prev + 1); // Refresh the data after deletion
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting abonement:", error);
      toast.error(
        "Une erreur s'est produite lors de la suppression de l'abonnement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredabonements = abonementsList.filter((match) =>
      match.title.toLowerCase().includes(searchTerm)
    );
    setAbonements(filteredabonements);
  };
  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, [refresh]);

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
          message="Êtes-vous sûr de vouloir supprimer cet abonnement ? Cette action est irréversible."
          setShowModal={setShowDeleteModal}
          deleter={handleDelete}
        />
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un match..."
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
              <th className="px-6 py-3 text-sm font-medium">Titre</th>
              <th className="px-6 py-3 text-sm font-medium">Season</th>
              <th className="px-6 py-3 text-sm font-medium">Prix</th>
              <th className="px-6 py-3 text-sm font-medium">Etat</th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {abonements.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun abonement trouvé
                </td>
              </tr>
            ) : (
              abonements.map((abonement) => (
                <tr key={abonement.id} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{abonement.title}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement.season}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement.price.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "CAD",
                    })}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {abonement.status === "active" ? (
                      <span className="text-green-600">Actif</span>
                    ) : (
                      <span className="text-red-600">Inactif</span>
                    )}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <Link
                      href={`/abonnements/${abonement.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <IoPencil size={22} />
                    </Link>
                    <button
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      onClick={() => {
                        setAbonementToDelete(abonement);
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

export default AbonementsContent;
