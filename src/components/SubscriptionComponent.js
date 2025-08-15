"use client";

import React, { useEffect } from "react";
import Spinner from "./spinner/Spinner";
import Image from "next/image";
import { WarningIcon } from "@/assets/svgs";
import { getSubscriptionByCode } from "@/services/abonement.service";

const SubscriptionComponent = ({ code }) => {
  const [subscription, setSubscription] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionByCode(code);
      console.log("Response from getSubscriptionByCode:", response);
      if (response) {
        console.log("Subscription data:", response);
        setSubscription(response.data);
      } else {
        setError("Subscription not found");
      }
    } catch (err) {
      setError("An error occurred while fetching the subscription.");
      console.error("Error fetching subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [code]);
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
  const formatDate2 = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    const date = new Date(milliseconds);

    const str = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Etc/GMT-1", // ← freeze at UTC
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });

    return `${dayName} ${str}`;
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
            onClick={() => fetchSubscription()}
            className="mt-4 px-4 py-2 bg-[#DD636E] text-white rounded-lg cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[calc(100vh-100px)] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Détails de l&apos;abonnement</h2>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex ">
          <div className="flex-1">
            <p className="text-gray-700 mb-2">
              <strong>Code de l&apos;abonnement:</strong> {subscription.code}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Date d&apos;achat :</strong>{" "}
              {formatDate(subscription.createdAt)}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Abonnement:</strong> {subscription.abonnement.title} (
              {subscription.abonnement.season})
            </p>
          </div>
        </div>
      </div>
      {subscription.user && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Client</h2>

          <div className="bg-white shadow-md rounded-lg p-6 mb-1">
            <div className="flex ">
              <div className="flex-1">
                <p className="text-gray-700 mb-2">
                  <strong>Prénom et Nom:</strong> {subscription.user.userName}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Courriel :</strong> {subscription.user.email}
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Membre depuis :</strong>{" "}
                  {formatDate(subscription.user.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {subscription.matchs && (
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Abonnement utilisé sur</h2>
          {subscription.matchs.length === 0 ? (
            <p className="text-gray-500">
              Aucun match associé à cet abonnement.
            </p>
          ) : (
            <div className="bg-white shadow-md rounded-lg p-6">
              {subscription.matchs.map((match) => (
                <div
                  className="bg-white shadow-md rounded-lg p-6 mb-1"
                  key={match.id}
                >
                  <div className="flex ">
                    <div className="flex-1">
                      <p className="text-gray-700 mb-2">
                        <strong>Match :</strong> Mégatoit vs{" "}
                        {match.opponent.name}
                      </p>
                      <p className="text-gray-700 mb-2">
                        <strong>Date :</strong> {formatDate2(match.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionComponent;
