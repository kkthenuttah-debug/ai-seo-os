import { createContext, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface NotificationContextValue {
  notify: (message: string) => void;
  notifySuccess: (message: string) => void;
  error: (message: string) => void;
  showError: (message: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notify = useCallback((message: string) => {
    toast(message);
  }, []);

  const notifySuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const value = useMemo(() => ({ notify, notifySuccess, error, showError: error }), [notify, notifySuccess, error]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
