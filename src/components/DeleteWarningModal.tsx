import React from "react";

const DeleteWarningModal = ({ setShowModal, message, deleter }) => {
  return (
    <div className="absolute  flex items-center justify-center bg-black/30 z-10 inset-0 ">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <div className="flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-center text-gray-800 mb-4">
          Êtes-vous sûr de vouloir supprimer ?
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          {message || "Cette action est irréversible."}
        </p>
        <div className="flex justify-between">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={() => setShowModal(false)}
          >
            Annuler
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={deleter}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWarningModal;
