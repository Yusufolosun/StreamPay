import { useStreamPay } from "../app/providers";

export const useBlockHeight = () => {
  const { blockHeight } = useStreamPay();
  return blockHeight;
};
export default useBlockHeight;
