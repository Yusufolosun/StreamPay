"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppConfig, UserSession, authenticate } from "@stacks/connect";
import { createNetwork } from "@stacks/network";
import { QueryCache, MutationCache } from "@tanstack/react-query";
import { ToastProvider, useToast } from "../components/Toast";
import { NotificationProvider } from "../hooks/useNotifications";

const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

const networkName = process.env.NEXT_PUBLIC_STACKS_NETWORK || "devnet";
const hiroApiUrl = process.env.NEXT_PUBLIC_HIRO_API_URL;

const network = createNetwork({
  network: networkName === "mainnet" ? "mainnet" : networkName === "testnet" ? "testnet" : "mocknet",
  client: {
    baseUrl: hiroApiUrl || (networkName === "mainnet" ? "https://api.mainnet.hiro.so" : networkName === "testnet" ? "https://api.testnet.hiro.so" : "http://localhost:3999"),
  },
});

interface StreamPayContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (walletType: "leather" | "xverse") => Promise<void>;
  disconnect: () => void;
  network: any;
  blockHeight: number;
}

const StreamPayContext = createContext<StreamPayContextType | undefined>(undefined);

export const StreamPayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [blockHeight, setBlockHeight] = useState<number>(0);

  // Poll block height from backend API every 10 seconds
  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/health`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.block_height === "number") {
            setBlockHeight(data.block_height);
          }
        }
      } catch (err) {
        console.error("Failed to fetch block height", err);
      }
    };

    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync wallet session on load
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const stxAddress =
        networkName === "mainnet"
          ? userData.profile.stxAddress.mainnet
          : userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
      setAddress(stxAddress || null);
      setIsConnected(true);
    }
  }, []);

  const connect = async (walletType: "leather" | "xverse") => {
    setIsConnecting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        authenticate({
          appDetails: {
            name: "StreamPay",
            icon: typeof window !== "undefined" ? window.location.origin + "/logo.png" : "",
          },
          userSession,
          onFinish: () => {
            const userData = userSession.loadUserData();
            const stxAddress =
              networkName === "mainnet"
                ? userData.profile.stxAddress.mainnet
                : userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
            setAddress(stxAddress || null);
            setIsConnected(true);
            setIsConnecting(false);
            resolve();
          },
          onCancel: () => {
            setIsConnecting(false);
            reject(new Error("Connection cancelled by user"));
          },
        });
      });
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }
  };

  const disconnect = () => {
    userSession.signUserOut();
    setAddress(null);
    setIsConnected(false);
  };

  return (
    <StreamPayContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        network,
        blockHeight,
      }}
    >
      {children}
    </StreamPayContext.Provider>
  );
};

export const useStreamPay = () => {
  const context = useContext(StreamPayContext);
  if (context === undefined) {
    throw new Error("useStreamPay must be used within a StreamPayProvider");
  }
  return context;
};

const QueryClientProviderWithToast: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { error: toastError } = useToast();
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (err) => {
        toastError(err.message || "An error occurred fetching data");
      }
    }),
    mutationCache: new MutationCache({
      onError: (err) => {
        toastError(err.message || "An error occurred performing mutation");
      }
    }),
    defaultOptions: {
      queries: {
        staleTime: 10000,
        retry: 2,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      }
    }
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <QueryClientProviderWithToast>
        <StreamPayProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </StreamPayProvider>
      </QueryClientProviderWithToast>
    </ToastProvider>
  );
};
