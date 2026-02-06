import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { router } from "./router";

function App() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner label="Loading" />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors theme="system" />
    </>
  );
}

export default App;
