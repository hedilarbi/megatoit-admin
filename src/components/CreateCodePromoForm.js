"use client";
import React, { useState } from "react";
import { createPromoCode } from "@/services/match.service";
import toast from "react-hot-toast";

const CreateCodePromoForm = () => {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");

  const [error, setError] = useState(null);

  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [usagePerUser, setUsagePerUser] = useState(1);
  const [typeOfUsage, setTypeOfUsage] = useState("limited");

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

    if (!endDate) {
      setError("Date de fin obligatoire");
      return;
    }
    if (typeOfUsage === "limited" && usagePerUser <= 0) {
      setError("Usage par utilisateur doit être supérieur à 0");
      return;
    }

    setError(null);

    try {
      setCreating(true);
      const response = await createPromoCode({
        code: code.toUpperCase(),
        type,
        amount: type === "amount" ? value : null,
        percent: type === "percent" ? value : null,
        startDate: new Date().toISOString(),
        usagePerUser: typeOfUsage === "limited" ? usagePerUser : null,
        endDate: new Date(endDate).toISOString(),
      });

      if (response.success) {
        setCode("");
        setType("percent");
        setValue("");
        setEndDate("");
        setUsagePerUser(1);
        setTypeOfUsage("limited");
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="percent">Pourcentage</option>
              <option value="amount">Montant fixe</option>
            </select>
          </div>
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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
                    ? "border-2 border-blue-500 bg-blue-500/40 "
                    : "bg-white border-2 border-gray-500"
                } px-4 py-2 rounded-md`}
                onClick={() => setTypeOfUsage("limited")}
              >
                <span>limité</span>
              </button>

              <button
                className={`${
                  typeOfUsage === "unlimited"
                    ? "border-2 border-blue-500 bg-blue-500/40 "
                    : "bg-white border-2 border-gray-500"
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
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="bg-blue-500 text-white px-6 py-2 rounded  transition font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
