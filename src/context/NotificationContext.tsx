import { createContext, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface NotificationContextValue {
  notify: (message: string) => void;
  error: (message: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notify = useCallback((message: string) => {
    toast(message);
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const value = useMemo(() => ({ notify, error }), [notify, error]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
