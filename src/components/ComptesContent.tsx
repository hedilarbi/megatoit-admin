"use client";

import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";
import { IoTrash } from "react-icons/io5";
import Image from "next/image";

import DeleteWarningModal from "./DeleteWarningModal";
import { Abonement } from "@/types/abonement";

import toast from "react-hot-toast";
import { getAllEmployees, updateAccountStatus } from "@/services/user.service";
import axios from "axios";
const ComptesContent = () => {
  const [comptes, setComptes] = useState<Abonement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [compteToDelete, setCompteToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllEmployees();
      if (response.success) {
        setComptes(response.data ?? []);
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
      const response = await axios.delete(`/api/delete-account`, {
        data: { uid: compteToDelete },
      });

      if (response.data.success) {
        setRefresh((prev) => prev + 1); // Refresh the data after deletion
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        "Une erreur s'est produite lors de la suppression du compte."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (uid: string, status: string) => {
    try {
      setSubmitting(true);
      const response = await updateAccountStatus(uid, status);
      if (response.success) {
        toast.success("Statut du compte mis à jour avec succès.");
        setRefresh((prev) => prev + 1); // Refresh the data after update
      } else {
        toast.error("Échec de la mise à jour du statut du compte.");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du statut du compte :",
        error
      );
      toast.error(
        "Une erreur s'est produite lors de la mise à jour du statut du compte."
      );
    } finally {
      setSubmitting(false);
    }
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
          message="Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible."
          setShowModal={setShowDeleteModal}
          deleter={handleDelete}
        />
      )}

      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30  z-20">
          <Spinner />
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg  h-[calc(100vh-200px)]  overflow-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Nom et Prenom</th>
              <th className="px-6 py-3 text-sm font-medium">Email</th>

              <th className="px-6 py-3 text-sm font-medium">Etat</th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {comptes.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun abonement trouvé
                </td>
              </tr>
            ) : (
              comptes.map((compte) => (
                <tr key={compte.uid} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{compte.userName}</td>
                  <td className="px-6 py-4 text-gray-700">{compte.email}</td>

                  <td className="px-6 py-4 text-gray-700">
                    <select
                      defaultValue={compte.status}
                      className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) =>
                        handleUpdateStatus(compte.uid, e.target.value)
                      }
                    >
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <button
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      onClick={() => {
                        setCompteToDelete(compte.uid);
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

export default ComptesContent;
