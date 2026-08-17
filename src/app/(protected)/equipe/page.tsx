"use client";
import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const CreateTeamPage = () => {
  const [teamName, setTeamName] = useState("");
  const [fullName, setFullName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async () => {
    if (!imageFile) return null;

    const storage = getStorage();
    const storageRef = ref(storage, `team-images/${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrl = await handleImageUpload();
      const firestore = getFirestore();
      const teamsCollection = collection(firestore, "teams");

      await addDoc(teamsCollection, {
        name: teamName,
        "full-name": fullName || teamName,
        fullName: fullName || teamName,
        imageUrl,
      });

      alert("Équipe créée avec succès !");
      setTeamName("");
      setFullName("");
      setImageFile(null);
    } catch (error) {
      console.error("Erreur lors de la création de l'équipe :", error);
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Créer une équipe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom court / Abréviation :
          </label>
          <input
            type="text"
            placeholder="Ex: Trois-Rivières"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet (Full Name) :
          </label>
          <input
            type="text"
            placeholder="Ex: BSR DE TROIS-RIVIÈRES"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image de l&apos;équipe :
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-4 py-2 text-white font-medium rounded-md ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-gray-800"
          } focus:outline-none focus:ring-2 focus:ring-black`}
        >
          {loading ? "Création..." : "Créer l'équipe"}
        </button>
      </form>
    </div>
  );
};

export default CreateTeamPage;
