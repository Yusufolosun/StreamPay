import { useStreamPay } from "../app/providers";

export const useWallet = () => {
  const { address, isConnected, isConnecting, connect, disconnect, network } = useStreamPay();
  return { address, isConnected, isConnecting, connect, disconnect, network };
};
export default useWallet;
