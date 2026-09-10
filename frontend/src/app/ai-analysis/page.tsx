import { AiChatDashboard } from "@/components/AiChatDashboard";

export default function AiAnalysisPage() {
  return (
    <div className="ui-page">
      <div className="ui-container">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
            AI Analysis
          </h1>
          <p className="ui-description">
            AI-powered research and insights on any stock
          </p>
        </div>

        <AiChatDashboard />
      </div>
    </div>
  );
}
