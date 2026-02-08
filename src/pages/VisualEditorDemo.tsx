import { useState } from "react";
import { VisualEditor } from "@/components/VisualEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ElementorData } from "@/types/elementor";
import { useNotification } from "@/hooks/useNotification";

export default function VisualEditorDemo() {
  const navigate = useNavigate();
  const { notifySuccess } = useNotification();
  const [savedData, setSavedData] = useState<ElementorData | null>(null);

  const handleSave = (data: ElementorData) => {
    setSavedData(data);
    notifySuccess("Layout saved successfully!");
    console.log("Saved Elementor Data:", data);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-background p-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Visual Editor Demo</h1>
              <p className="text-sm text-muted-foreground">
                Build pages with drag-and-drop simplicity
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full max-w-screen-2xl mx-auto">
          <VisualEditor
            initialData={savedData || undefined}
            onSave={handleSave}
          />
        </div>
      </main>
    </div>
  );
}
