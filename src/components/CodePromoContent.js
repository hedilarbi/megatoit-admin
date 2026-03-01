"use client";
import { getAllPromoCodes, deletePromoCode } from "@/services/match.service";
import React, { useState, useEffect } from "react";
import Spinner from "./spinner/Spinner";

import { WarningIcon } from "@/assets/svgs";
import { IoTrash } from "react-icons/io5";
import Image from "next/image";

import DeleteWarningModal from "./DeleteWarningModal";
import toast from "react-hot-toast";

const formatPromoDate = (dateLike) => {
  if (!dateLike) return "-";

  if (typeof dateLike === "string") {
    const isoMatch = dateLike.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

    const frMatch = dateLike.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frMatch) {
      const day = frMatch[1].padStart(2, "0");
      const month = frMatch[2].padStart(2, "0");
      return `${day}/${month}/${frMatch[3]}`;
    }
  }

  const dateObj =
    dateLike?.toDate && typeof dateLike.toDate === "function"
      ? dateLike.toDate()
      : new Date(dateLike);

  if (!Number.isNaN(dateObj?.getTime?.())) {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj);
  }

  return String(dateLike);
};

const CodePromoContent = () => {
  const [promoCodes, setPromoCodes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllPromoCodes();
      if (response.success) {
        setPromoCodes(response.data ?? []);
      } else {
        console.error("Failed to fetch promo codes");
        setError(response.error ?? null);
      }
    } catch (error) {
      setError(
        "Une erreur s'est produite lors de la récupération des codes promo."
      );
      console.error("Error fetching promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Fetch data when the component mounts
  }, [refresh]);

  const handleDelete = async () => {
    try {
      setSubmitting(true);

      const response = await deletePromoCode(codeToDelete.id);
      if (response.success) {
        toast.success("Code promo supprimé avec succès !");
        setRefresh((prev) => prev + 1); // Trigger a refresh in the parent component
        setShowDeleteModal(false);
      } else {
        toast.error(
          response.error || "Erreur lors de la suppression du code promo."
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du code promo :", error);
      toast.error("Erreur lors de la suppression du code promo.");
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
          message="Êtes-vous sûr de vouloir supprimer ce code promo ? Cette action est irréversible."
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
              <th className="px-6 py-3 text-sm font-medium">Code</th>
              <th className="px-6 py-3 text-sm font-medium">Type</th>
              <th className="px-6 py-3 text-sm font-medium">valeur</th>
              <th className="px-6 py-3 text-sm font-medium">
                Limite d&apos;utilisations par client
              </th>
              <th className="px-6 py-3 text-sm font-medium">
                Limite d&apos;utilisations totales
              </th>
              <th className="px-6 py-3 text-sm font-medium">
                Nombre d&apos;utilisations totales
              </th>

              <th className="px-6 py-3 text-sm font-medium">
                Date d&apos;expiration
              </th>

              <th className="px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Exemple de données statiques */}
            {promoCodes.length === 0 ? (
              <tr className="text-center">
                <td colSpan={4} className="px-6 py-4 text-gray-500">
                  Aucun code promo trouvé
                </td>
              </tr>
            ) : (
              promoCodes.map((promoCode) => (
                <tr key={promoCode.id} className="hover:bg-gray-100 transition">
                  <td className="px-6 py-4 text-gray-700">{promoCode.code}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {promoCode.type === "percent"
                      ? "Pourcentage"
                      : "Montant fixe"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {promoCode.type === "percent"
                      ? `${promoCode.percent}%`
                      : `$${promoCode.amount} `}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {promoCode.usagePerUser
                      ? promoCode.usagePerUser
                      : "Illimité"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {promoCode.totalUsage ? promoCode.totalUsage : "Illimité"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {promoCode.used ? promoCode.used : "0"}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatPromoDate(promoCode.endDate)}
                  </td>

                  <td className="px-6 py-4 flex space-x-5 items-center ">
                    <button
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                      onClick={() => {
                        setCodeToDelete(promoCode);
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

export default CodePromoContent;
