import { SmartMoneyDashboard } from "@/components/SmartMoneyDashboard";

export default function SmartMoneyPage() {
  return (
    <div className="ui-page">
      <div className="ui-container">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          Smart Money
        </h1>
        <p className="ui-description">
          What institutional funds and members of Congress are buying and selling
        </p>
        <SmartMoneyDashboard />
      </div>
    </div>
  );
}
