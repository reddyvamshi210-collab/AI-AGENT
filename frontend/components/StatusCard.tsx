interface StatusCardProps {
  label: string;
  status: "active" | "pending" | "error";
  detail: string;
}

export function StatusCard({ label, status, detail }: StatusCardProps) {
  const statusColors = {
    active: "bg-green-500",
    pending: "bg-yellow-500",
    error: "bg-red-500",
  };

  const bgColors = {
    active: "bg-green-500/10 border-green-500/20",
    pending: "bg-yellow-500/10 border-yellow-500/20",
    error: "bg-red-500/10 border-red-500/20",
  };

  return (
    <div className={`rounded-xl border p-3 ${bgColors[status]}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1 ml-4">{detail}</p>
    </div>
  );
}
